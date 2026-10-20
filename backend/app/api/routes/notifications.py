from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, insert, literal, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user
from backend.app.api.schemas import (
    AnnouncementAdminResponse,
    AnnouncementCreateRequest,
    AnnouncementResponse,
    NotificationInboxResponse,
)
from backend.app.core.config import get_settings
from backend.app.core.rate_limit import strict
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import (
    Announcement,
    AnnouncementRead,
    AnnouncementRecipient,
    User,
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])
settings = get_settings()


def _require_owner(user: User) -> None:
    owner_emails = {
        email.strip().lower()
        for email in settings.SUPPORT_OWNER_EMAILS.split(",")
        if email.strip()
    }
    if not owner_emails or user.email.strip().lower() not in owner_emails:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access required")


def _announcement_response(announcement: Announcement, is_read: bool) -> AnnouncementResponse:
    return AnnouncementResponse(
        announcement_id=announcement.announcement_id,
        title=announcement.title,
        message=announcement.message,
        kind=announcement.kind,
        published_at=announcement.published_at,
        is_read=is_read,
    )


@router.get("", response_model=NotificationInboxResponse)
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return recent owner announcements and an exact unread count for this account."""
    unread_count = (
        db.query(func.count(AnnouncementRecipient.announcement_id))
        .filter(AnnouncementRecipient.user_id == current_user.user_id)
        .outerjoin(
            AnnouncementRead,
            and_(
                AnnouncementRead.announcement_id == AnnouncementRecipient.announcement_id,
                AnnouncementRead.user_id == current_user.user_id,
            ),
        )
        .filter(AnnouncementRead.user_id.is_(None))
        .scalar()
        or 0
    )
    rows = (
        db.query(Announcement, AnnouncementRead.read_at)
        .join(
            AnnouncementRecipient,
            AnnouncementRecipient.announcement_id == Announcement.announcement_id,
        )
        .outerjoin(
            AnnouncementRead,
            and_(
                AnnouncementRead.announcement_id == Announcement.announcement_id,
                AnnouncementRead.user_id == current_user.user_id,
            ),
        )
        .filter(AnnouncementRecipient.user_id == current_user.user_id)
        .order_by(Announcement.published_at.desc(), Announcement.announcement_id.desc())
        .limit(50)
        .all()
    )
    return NotificationInboxResponse(
        unread_count=unread_count,
        items=[_announcement_response(announcement, read_at is not None) for announcement, read_at in rows],
    )


@router.post("/{announcement_id}/read")
def mark_notification_read(
    announcement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    announcement = (
        db.query(Announcement)
        .join(
            AnnouncementRecipient,
            AnnouncementRecipient.announcement_id == Announcement.announcement_id,
        )
        .filter(
            Announcement.announcement_id == announcement_id,
            AnnouncementRecipient.user_id == current_user.user_id,
        )
        .first()
    )
    if announcement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    receipt = (
        db.query(AnnouncementRead)
        .filter_by(announcement_id=announcement_id, user_id=current_user.user_id)
        .first()
    )
    if receipt is None:
        db.add(AnnouncementRead(announcement_id=announcement_id, user_id=current_user.user_id))
        try:
            db.commit()
        except IntegrityError:
            # A second tab may have created the same read receipt concurrently.
            db.rollback()
    return {"success": True}


@router.post("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing_ids = {
        row.announcement_id
        for row in db.query(AnnouncementRead.announcement_id)
        .filter(AnnouncementRead.user_id == current_user.user_id)
        .all()
    }
    unread_ids = [
        row.announcement_id
        for row in db.query(AnnouncementRecipient.announcement_id)
        .filter(AnnouncementRecipient.user_id == current_user.user_id)
        .all()
        if row.announcement_id not in existing_ids
    ]
    db.add_all(
        AnnouncementRead(announcement_id=announcement_id, user_id=current_user.user_id)
        for announcement_id in unread_ids
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return {"success": True, "marked_read": len(unread_ids)}


@router.get("/owner/audience-size")
def get_owner_audience_size(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_owner(current_user)
    eligible = (User.is_active.is_(True), User.is_verified.is_(True))
    count = db.query(func.count(User.user_id)).filter(*eligible).scalar() or 0
    return {"active_verified_accounts": count}


@router.get("/owner/announcements", response_model=list[AnnouncementAdminResponse])
def list_owner_announcements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_owner(current_user)
    announcements = (
        db.query(Announcement)
        .order_by(Announcement.published_at.desc(), Announcement.announcement_id.desc())
        .limit(50)
        .all()
    )
    return [
        AnnouncementAdminResponse(
            **_announcement_response(announcement, False).model_dump(),
            audience_size=announcement.audience_size,
        )
        for announcement in announcements
    ]


@router.post(
    "/owner/announcements",
    response_model=AnnouncementAdminResponse,
    status_code=status.HTTP_201_CREATED,
)
def publish_announcement(
    payload: AnnouncementCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Publish one in-app announcement to every active, verified account at send time."""
    _require_owner(current_user)
    announcement = Announcement(
        title=payload.title.strip(),
        message=payload.message.strip(),
        kind=payload.kind,
        created_by_user_id=current_user.user_id,
        published_at=datetime.now(timezone.utc),
    )
    db.add(announcement)
    db.flush()
    audience_query = select(literal(announcement.announcement_id), User.user_id).where(
        User.is_active.is_(True), User.is_verified.is_(True)
    )
    db.execute(
        insert(AnnouncementRecipient).from_select(
            ["announcement_id", "user_id"], audience_query
        )
    )
    announcement.audience_size = (
        db.query(func.count(AnnouncementRecipient.user_id))
        .filter(AnnouncementRecipient.announcement_id == announcement.announcement_id)
        .scalar()
        or 0
    )
    db.commit()
    db.refresh(announcement)
    return AnnouncementAdminResponse(
        **_announcement_response(announcement, False).model_dump(),
        audience_size=announcement.audience_size,
    )
