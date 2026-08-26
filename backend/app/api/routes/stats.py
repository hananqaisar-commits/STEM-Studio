from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.schemas import (
    PlatformStatsResponse,
    ReviewCreateRequest,
    ReviewResponse,
)
from backend.app.core.rate_limit import strict
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import Review, User

router = APIRouter(prefix="/api/stats", tags=["Platform Stats"])


@router.get("/platform", response_model=PlatformStatsResponse)
def get_platform_stats(db: Session = Depends(get_db)):
    """Return public platform statistics."""
    active_learners = db.query(User).count()
    review_stats = db.query(
        func.count(Review.review_id).label("total"),
        func.coalesce(func.avg(Review.rating), 0).label("average"),
    ).filter(Review.approved.is_(True)).first()

    return PlatformStatsResponse(
        active_learners=active_learners,
        total_reviews=review_stats.total or 0,
        average_rating=round(float(review_stats.average or 0), 2),
    )


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
    """Submit a new review for moderation."""
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
