from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import and_, func, insert, literal, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user, require_owner, require_recent_owner
from backend.app.api.schemas import (
    AnnouncementAdminResponse,
    AnnouncementCreateRequest,
    AnnouncementResponse,
    NotificationInboxResponse,
)
from backend.app.core.owner_security import record_admin_event
from backend.app.core.rate_limit import strict
from backend.app.core.config import get_settings
from backend.app.core.email import send_owner_broadcast_emails
from backend.infrastructure.database.database import get_db
from backend.infrastructure.database.models import (
    Announcement,
    AnnouncementEmailDelivery,
    AnnouncementRead,
    AnnouncementRecipient,
    User,
    UserPreference,
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])
settings = get_settings()


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
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    eligible = (User.is_active.is_(True), User.is_verified.is_(True))
    count = db.query(func.count(User.user_id)).filter(*eligible).scalar() or 0
    marketing_count = (
        db.query(func.count(User.user_id))
        .join(UserPreference, UserPreference.user_id == User.user_id)
        .filter(*eligible, UserPreference.marketing_email_opt_in.is_(True))
        .scalar()
        or 0
    )
    return {
        "active_verified_accounts": count,
        "marketing_opt_in_accounts": marketing_count,
        "email_configured": bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD),
    }


@router.get("/owner/announcements", response_model=list[AnnouncementAdminResponse])
def list_owner_announcements(
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
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
            email_requested=announcement.email_requested,
            email_audience_size=announcement.email_audience_size,
            email_status=announcement.email_status,
            email_sent_count=announcement.email_sent_count,
            email_failed_count=announcement.email_failed_count,
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
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Publish in-app and optionally email a consent-aware account audience."""
    if payload.send_email and not (settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery is unavailable because the backend SMTP provider is not configured.",
        )

    promotional = payload.kind in {"promotion", "product_update"}
    announcement = Announcement(
        title=payload.title.strip(),
        message=payload.message.strip(),
        kind=payload.kind,
        email_requested=payload.send_email,
        email_status="queued" if payload.send_email else "not_requested",
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

    email_recipients: list[tuple[int, str]] = []
    if payload.send_email:
        recipients_query = db.query(User.user_id, User.email).filter(
            User.is_active.is_(True), User.is_verified.is_(True)
        )
        if promotional:
            recipients_query = recipients_query.join(
                UserPreference, UserPreference.user_id == User.user_id
            ).filter(UserPreference.marketing_email_opt_in.is_(True))
        email_recipients = [(int(user_id), address) for user_id, address in recipients_query.order_by(User.user_id).all()]
        announcement.email_audience_size = len(email_recipients)
        db.add_all(
            AnnouncementEmailDelivery(
                announcement_id=announcement.announcement_id,
                user_id=user_id,
                status="queued",
            )
            for user_id, _ in email_recipients
        )
    announcement_id = announcement.announcement_id
    announcement_title = announcement.title
    announcement_message = announcement.message
    in_app_audience_size = announcement.audience_size
    db.commit()

    record_admin_event(
        db,
        actor_user_id=current_user.user_id,
        action="announcement.publish",
        details={
            "announcement_id": announcement_id,
            "audience_size": in_app_audience_size,
            "kind": payload.kind,
            "email_requested": payload.send_email,
            "email_audience_size": len(email_recipients),
        },
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    if payload.send_email:
        delivery_results = send_owner_broadcast_emails(
            email_recipients,
            subject=announcement_title,
            body=announcement_message,
            promotional=promotional,
        )
        attempted_at = datetime.now(timezone.utc)
        sent_count = sum(1 for outcome, _ in delivery_results.values() if outcome == "sent")
        failed_count = len(email_recipients) - sent_count
        with db.begin():
            for user_id, (outcome, error_type) in delivery_results.items():
                delivery = db.query(AnnouncementEmailDelivery).filter_by(
                    announcement_id=announcement_id,
                    user_id=user_id,
                ).first()
                if delivery is not None:
                    delivery.status = outcome
                    delivery.error_type = error_type
                    delivery.attempted_at = attempted_at
            current_announcement = db.query(Announcement).filter_by(announcement_id=announcement_id).one()
            current_announcement.email_sent_count = sent_count
            current_announcement.email_failed_count = failed_count
            current_announcement.email_status = (
                "no_recipients" if not email_recipients
                else "sent" if failed_count == 0
                else "failed" if sent_count == 0
                else "partial"
            )
            record_admin_event(
                db,
                actor_user_id=current_user.user_id,
                action="announcement.email_delivery",
                details={
                    "announcement_id": announcement_id,
                    "audience_size": len(email_recipients),
                    "sent": sent_count,
                    "failed": failed_count,
                },
                ip_address=request.client.host if request.client else None,
            )
    db.refresh(announcement)
    return AnnouncementAdminResponse(
        **_announcement_response(announcement, False).model_dump(),
        audience_size=announcement.audience_size,
        email_requested=announcement.email_requested,
        email_audience_size=announcement.email_audience_size,
        email_status=announcement.email_status,
        email_sent_count=announcement.email_sent_count,
        email_failed_count=announcement.email_failed_count,
    )
