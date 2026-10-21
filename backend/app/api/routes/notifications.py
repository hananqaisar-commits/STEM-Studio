from datetime import datetime, timedelta, timezone
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import and_, func, insert, literal, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.api.dependencies import get_current_user, require_owner, require_recent_owner
from backend.app.api.schemas import (
    AnnouncementDeleteRequest,
    AnnouncementAdminResponse,
    AnnouncementCreateRequest,
    AnnouncementResponse,
    NotificationInboxResponse,
)
from backend.app.core.owner_security import record_admin_event
from backend.app.core.rate_limit import strict
from backend.app.core.config import get_settings
from backend.app.core.email import send_owner_broadcast_emails, smtp_is_configured
from backend.infrastructure.database.database import SessionLocal, get_db
from backend.infrastructure.database.models import (
    Announcement,
    AnnouncementEmailDelivery,
    AnnouncementRead,
    AnnouncementRecipient,
    BillingNotice,
    User,
    UserPreference,
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])
settings = get_settings()
logger = logging.getLogger(__name__)


def deliver_announcement_emails(announcement_id: int, actor_user_id: int | None = None) -> None:
    """Deliver durable queued rows after the HTTP response and persist per-recipient results."""
    db = SessionLocal()
    try:
        announcement = db.query(Announcement).filter_by(announcement_id=announcement_id).first()
        if announcement is None or not announcement.email_requested:
            return
        now = datetime.now(timezone.utc)
        stale_before = now - timedelta(minutes=30)
        queued = db.query(AnnouncementEmailDelivery).filter(
            AnnouncementEmailDelivery.announcement_id == announcement_id,
            or_(
                AnnouncementEmailDelivery.status == "queued",
                and_(
                    AnnouncementEmailDelivery.status == "sending",
                    AnnouncementEmailDelivery.attempted_at < stale_before,
                ),
            ),
        ).with_for_update(skip_locked=True).limit(100).all()
        if not queued:
            return
        recipients: list[tuple[int, str]] = []
        for delivery in queued:
            delivery.status = "sending"
            delivery.attempted_at = now
            user = db.get(User, delivery.user_id)
            if user is None or not user.is_active or not user.is_verified:
                delivery.status = "skipped"
                delivery.error_type = "account_not_eligible"
                continue
            if announcement.kind in {"promotion", "product_update"}:
                preference = db.get(UserPreference, user.user_id)
                if preference is None or not preference.marketing_email_opt_in:
                    delivery.status = "skipped"
                    delivery.error_type = "consent_withdrawn"
                    continue
            recipients.append((user.user_id, user.email))
        db.commit()

        results = send_owner_broadcast_emails(
            recipients,
            subject=announcement.title,
            body=announcement.message,
            promotional=announcement.kind in {"promotion", "product_update"},
        )
        for user_id, (outcome, error_type) in results.items():
            delivery = db.query(AnnouncementEmailDelivery).filter_by(
                announcement_id=announcement_id, user_id=user_id
            ).first()
            if delivery is not None:
                delivery.status = outcome
                delivery.error_type = error_type
                delivery.attempted_at = datetime.now(timezone.utc)
        announcement = db.query(Announcement).filter_by(announcement_id=announcement_id).first()
        if announcement is None:
            db.commit()
            return
        announcement.email_sent_count = db.query(func.count(AnnouncementEmailDelivery.delivery_id)).filter(
            AnnouncementEmailDelivery.announcement_id == announcement_id,
            AnnouncementEmailDelivery.status == "sent",
        ).scalar() or 0
        announcement.email_failed_count = db.query(func.count(AnnouncementEmailDelivery.delivery_id)).filter(
            AnnouncementEmailDelivery.announcement_id == announcement_id,
            AnnouncementEmailDelivery.status == "failed",
        ).scalar() or 0
        remaining = db.query(func.count(AnnouncementEmailDelivery.delivery_id)).filter(
            AnnouncementEmailDelivery.announcement_id == announcement_id,
            AnnouncementEmailDelivery.status.in_(("queued", "sending")),
        ).scalar() or 0
        if remaining:
            announcement.email_status = "queued"
        elif announcement.email_sent_count and announcement.email_failed_count:
            announcement.email_status = "partial"
        elif announcement.email_failed_count:
            announcement.email_status = "failed"
        elif announcement.email_sent_count:
            announcement.email_status = "sent"
        else:
            announcement.email_status = "no_recipients"
        record_admin_event(
            db, actor_user_id=actor_user_id or announcement.created_by_user_id,
            action="announcement.email_delivery",
            details={"announcement_id": announcement_id, "attempted": len(results),
                     "sent": announcement.email_sent_count, "failed": announcement.email_failed_count},
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        # Status remains durable; the owner can retry from the broadcast history.
        logger.error("Broadcast email worker failed (%s)", type(exc).__name__)
    finally:
        db.close()


def process_queued_announcement_emails(limit: int = 100) -> dict[str, int]:
    """Recover queued/stale broadcast outbox rows from a scheduled worker command."""
    db = SessionLocal()
    try:
        ids = [row[0] for row in db.query(AnnouncementEmailDelivery.announcement_id).filter(
            or_(
                AnnouncementEmailDelivery.status == "queued",
                and_(
                    AnnouncementEmailDelivery.status == "sending",
                    AnnouncementEmailDelivery.attempted_at < datetime.now(timezone.utc) - timedelta(minutes=30),
                ),
            )
        ).distinct().order_by(AnnouncementEmailDelivery.announcement_id.asc()).limit(limit).all()]
    finally:
        db.close()
    for announcement_id in ids:
        deliver_announcement_emails(announcement_id)
    return {"announcements_processed": len(ids)}


def _announcement_response(announcement: Announcement, is_read: bool) -> AnnouncementResponse:
    return AnnouncementResponse(
        announcement_id=announcement.announcement_id,
        title=announcement.title,
        message=announcement.message,
        kind=announcement.kind,
        published_at=announcement.published_at,
        is_read=is_read,
    )


def _billing_notice_response(notice: BillingNotice) -> AnnouncementResponse:
    # Negative IDs keep billing notices distinct from announcement IDs for
    # clients that still use the legacy integer field.
    return AnnouncementResponse(
        announcement_id=-notice.notice_id,
        title=notice.title,
        message=notice.message,
        kind="billing",
        published_at=notice.created_at,
        is_read=notice.read_at is not None,
        source="billing",
        notification_id=str(notice.notice_id),
    )


def _notification_sort_time(item: AnnouncementResponse) -> float:
    value = item.published_at
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.timestamp()


@router.get("", response_model=NotificationInboxResponse)
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return recent owner announcements and an exact unread count for this account."""
    announcement_unread_count = (
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
    billing_unread_count = db.query(func.count(BillingNotice.notice_id)).filter(
        BillingNotice.user_id == current_user.user_id,
        BillingNotice.read_at.is_(None),
    ).scalar() or 0
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
    notices = db.query(BillingNotice).filter_by(user_id=current_user.user_id).order_by(
        BillingNotice.created_at.desc(), BillingNotice.notice_id.desc()
    ).limit(50).all()
    items = [_announcement_response(announcement, read_at is not None) for announcement, read_at in rows]
    items.extend(_billing_notice_response(notice) for notice in notices)
    items.sort(key=_notification_sort_time, reverse=True)
    return NotificationInboxResponse(
        unread_count=announcement_unread_count + billing_unread_count,
        items=items[:50],
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


@router.post("/billing/{notice_id}/read")
def mark_billing_notification_read(
    notice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notice = db.query(BillingNotice).filter_by(
        notice_id=notice_id,
        user_id=current_user.user_id,
    ).first()
    if notice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notice.read_at is None:
        notice.read_at = datetime.now(timezone.utc)
        db.commit()
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
    billing_unread = db.query(BillingNotice).filter(
        BillingNotice.user_id == current_user.user_id,
        BillingNotice.read_at.is_(None),
    ).all()
    now = datetime.now(timezone.utc)
    for notice in billing_unread:
        notice.read_at = now
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return {"success": True, "marked_read": len(unread_ids) + len(billing_unread)}


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
        "email_configured": smtp_is_configured(),
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
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    """Publish in-app and optionally email a consent-aware account audience."""
    if payload.send_email and not smtp_is_configured():
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

    email_audience_size = 0
    if payload.send_email:
        recipients_query = db.query(User.user_id).filter(
            User.is_active.is_(True), User.is_verified.is_(True)
        )
        if promotional:
            recipients_query = recipients_query.join(
                UserPreference, UserPreference.user_id == User.user_id
            ).filter(UserPreference.marketing_email_opt_in.is_(True))
        email_audience_size = recipients_query.count()
        announcement.email_audience_size = email_audience_size
        if not email_audience_size:
            announcement.email_status = "no_recipients"
        else:
            delivery_query = select(
                literal(announcement.announcement_id), User.user_id, literal("queued")
            ).select_from(User).where(User.is_active.is_(True), User.is_verified.is_(True))
            if promotional:
                delivery_query = delivery_query.join(
                    UserPreference, UserPreference.user_id == User.user_id
                ).where(UserPreference.marketing_email_opt_in.is_(True))
            db.execute(insert(AnnouncementEmailDelivery).from_select(
                ["announcement_id", "user_id", "status"], delivery_query
            ))
    announcement_id = announcement.announcement_id
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
            "email_audience_size": email_audience_size,
        },
        ip_address=request.client.host if request.client else None,
    )
    db.commit()

    if payload.send_email and email_audience_size:
        background_tasks.add_task(deliver_announcement_emails, announcement_id, current_user.user_id)
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


@router.post("/owner/announcements/{announcement_id}/retry-email")
def retry_announcement_email(
    announcement_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    announcement = db.query(Announcement).filter_by(announcement_id=announcement_id).first()
    if announcement is None:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    if not announcement.email_requested:
        raise HTTPException(status_code=409, detail="Email delivery was not requested for this broadcast")
    if not smtp_is_configured():
        raise HTTPException(status_code=503, detail="Email delivery is unavailable because SMTP is not configured on the backend")
    failed_deliveries = db.query(AnnouncementEmailDelivery).filter(
        AnnouncementEmailDelivery.announcement_id == announcement_id,
        AnnouncementEmailDelivery.status == "failed",
    ).all()
    if not failed_deliveries:
        raise HTTPException(status_code=409, detail="There are no failed email deliveries to retry")
    for delivery in failed_deliveries:
        delivery.status = "queued"
        delivery.error_type = None
    announcement.email_status = "queued"
    record_admin_event(
        db, actor_user_id=current_user.user_id, action="announcement.email_retry",
        details={"announcement_id": announcement_id, "retry_queued": len(failed_deliveries)},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    background_tasks.add_task(deliver_announcement_emails, announcement_id, current_user.user_id)
    return {"announcement_id": announcement_id, "email_status": "queued", "retry_queued": len(failed_deliveries)}


@router.delete("/owner/announcements")
def delete_owner_announcements(
    payload: AnnouncementDeleteRequest,
    request: Request,
    current_user: User = Depends(require_recent_owner),
    db: Session = Depends(get_db),
    _rate: None = Depends(strict),
):
    query = db.query(Announcement)
    if not payload.delete_all:
        query = query.filter(Announcement.announcement_id.in_(payload.announcement_ids))
    deleted = query.count()
    if deleted:
        # Explicitly remove dependent rows so cleanup also works on SQLite
        # deployments where foreign-key cascade enforcement may be disabled.
        announcement_ids = select(Announcement.announcement_id)
        if not payload.delete_all:
            announcement_ids = announcement_ids.where(Announcement.announcement_id.in_(payload.announcement_ids))
        db.query(AnnouncementRead).filter(AnnouncementRead.announcement_id.in_(announcement_ids)).delete(synchronize_session=False)
        db.query(AnnouncementRecipient).filter(AnnouncementRecipient.announcement_id.in_(announcement_ids)).delete(synchronize_session=False)
        db.query(AnnouncementEmailDelivery).filter(AnnouncementEmailDelivery.announcement_id.in_(announcement_ids)).delete(synchronize_session=False)
        query.delete(synchronize_session=False)
    record_admin_event(
        db, actor_user_id=current_user.user_id, action="announcement.delete",
        details={"deleted_count": deleted, "delete_all": payload.delete_all,
                 "selected_count": len(payload.announcement_ids)},
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    return {"deleted": deleted}
