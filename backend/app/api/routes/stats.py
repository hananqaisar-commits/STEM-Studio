import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from redis.exceptions import RedisError
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.schemas import (
    PlatformStatsResponse,
    ReviewCreateRequest,
    ReviewResponse,
)
from backend.app.api.dependencies import get_current_user, require_owner, require_recent_owner
from backend.app.core.rate_limit import get_redis_client, log_redis_failure, strict
from backend.app.core.owner_security import record_admin_event
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import Review, User

router = APIRouter(prefix="/api/stats", tags=["Platform Stats"])
logger = logging.getLogger(__name__)
from backend.app.core.config import get_settings

settings = get_settings()
_PLATFORM_STATS_CACHE_KEY = f"{settings.REDIS_KEY_PREFIX}:platform-stats:v1"


def invalidate_platform_stats_cache() -> None:
    """Drop cached totals after account mutations so the count stays current."""
    if not settings.REDIS_URL:
        return
    try:
        get_redis_client().delete(_PLATFORM_STATS_CACHE_KEY)
    except RedisError:
        log_redis_failure("platform-stats cache invalidation")


@router.get("/platform", response_model=PlatformStatsResponse)
def get_platform_stats(db: Session = Depends(get_db)):
    """Return public totals; the learner metric is registered accounts, not activity."""
    cache_key = _PLATFORM_STATS_CACHE_KEY
    if settings.REDIS_URL:
        try:
            cached = get_redis_client().get(cache_key)
            if cached:
                return PlatformStatsResponse.model_validate_json(cached)
        except RedisError:
            log_redis_failure("platform-stats cache read")
        except ValueError:
            logger.warning("Platform stats cache payload was invalid; querying the database")

    registered_learners = db.query(func.count(User.user_id)).scalar() or 0
    review_stats = db.query(
        func.count(Review.review_id).label("total"),
        func.coalesce(func.avg(Review.rating), 0).label("average"),
    ).filter(Review.approved.is_(True)).first()

    response = PlatformStatsResponse(
        registered_learners=registered_learners,
        total_reviews=review_stats.total or 0,
        average_rating=round(float(review_stats.average or 0), 2),
    )
    if settings.REDIS_URL:
        try:
            get_redis_client().set(
                cache_key,
                response.model_dump_json(),
                ex=settings.PLATFORM_STATS_CACHE_SECONDS,
            )
        except RedisError:
            log_redis_failure("platform-stats cache write")
    return response


@router.get("/reviews", response_model=list[ReviewResponse])
def get_latest_reviews(limit: int = 10, db: Session = Depends(get_db)):
    """Return the latest approved reviews."""
    reviews = (
        db.query(Review)
        .filter(Review.approved.is_(True))
        .order_by(Review.created_at.desc())
        .limit(limit)
        .all()
    )
    return reviews


@router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def submit_review(
    payload: ReviewCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Place a new public review in the owner moderation queue."""
    review = Review(
        name=payload.name,
        role=payload.role,
        rating=payload.rating,
        text=payload.text,
        approved=False,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/reviews/pending", response_model=list[ReviewResponse])
def get_pending_reviews(
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    return db.query(Review).filter(Review.approved.is_(False)).order_by(Review.created_at.asc()).limit(200).all()


@router.patch("/reviews/{review_id}/approve", response_model=ReviewResponse)
def approve_review(
    review_id: int,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
):
    review = db.query(Review).filter(Review.review_id == review_id).first()
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    review.approved = True
    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        action="review.approve",
        details={"review_id": review.review_id},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(review)
    invalidate_platform_stats_cache()
    return review


@router.delete("/reviews/{review_id}")
def reject_review(
    review_id: int,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
):
    review = db.query(Review).filter(Review.review_id == review_id, Review.approved.is_(False)).first()
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending review not found")
    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        action="review.reject",
        details={"review_id": review.review_id},
        ip_address=request.client.host if request.client else None,
    )
    db.delete(review)
    db.commit()
    invalidate_platform_stats_cache()
    return {"success": True}
