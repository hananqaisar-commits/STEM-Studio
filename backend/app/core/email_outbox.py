"""Database-backed verification email dispatch shared by API replicas."""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, or_

from backend.app.core.config import get_settings
from backend.app.core.email import decrypt_verification_token, send_verification_email
from backend.infrastructure.database.database import SessionLocal
from backend.infrastructure.database.models import EmailOutbox, EmailVerification, User

logger = logging.getLogger(__name__)
_MAX_ATTEMPTS = 8
_LEASE_SECONDS = 90


def process_one_verification_email() -> bool:
    """Claim and try one due email. Returns False when the queue is empty."""
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        due_job = or_(
            and_(EmailOutbox.status == "pending", EmailOutbox.available_at <= now),
            and_(EmailOutbox.status == "processing", EmailOutbox.lease_expires_at <= now),
        )
        row = (
            db.query(EmailOutbox, User, EmailVerification)
            .join(User, User.user_id == EmailOutbox.user_id)
            .join(
                EmailVerification,
                EmailVerification.verification_id == EmailOutbox.verification_id,
            )
            .filter(due_job)
            .order_by(EmailOutbox.created_at, EmailOutbox.job_id)
            .with_for_update(skip_locked=True)
            .first()
        )
        if row is None:
            return False

        job, user, verification = row
        if (
            not get_settings().EMAIL_VERIFICATION_REQUIRED
            or user.is_verified
            or not user.is_active
            or verification.verified_at is not None
            or _as_utc(verification.expires_at) <= now
        ):
            job.status = "cancelled"
            job.lease_expires_at = None
            db.commit()
            return True

        job.status = "processing"
        job.lease_expires_at = now + timedelta(seconds=_LEASE_SECONDS)
        db.commit()
        job_id = job.job_id
        recipient = user.email
        encrypted_token = job.encrypted_token

    try:
        token = decrypt_verification_token(encrypted_token)
        settings = get_settings()
        verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
        sent = send_verification_email(
            recipient,
            verify_url,
            idempotency_key=f"stemstudio-verification:{job_id}",
        )
        error_category = None if sent else "email_delivery_failed"
    except Exception as exc:
        # Never log or persist verification tokens, URLs, inboxes, or secrets.
        logger.error("Verification email job failed during preparation (%s)", type(exc).__name__)
        sent = False
        error_category = "email_job_preparation_failed"

    with SessionLocal() as db:
        job = db.query(EmailOutbox).filter(EmailOutbox.job_id == job_id).first()
        if job is None or job.status != "processing":
            return True
        job.attempts += 1
        job.lease_expires_at = None
        if sent:
            job.status = "sent"
            job.delivered_at = datetime.now(timezone.utc)
            job.last_error_category = None
            logger.info("Verification email job accepted by provider (job_id=%s)", job_id)
        else:
            job.last_error_category = error_category
            if job.attempts >= _MAX_ATTEMPTS:
                job.status = "failed"
                logger.error(
                    "Verification email job exhausted retries (job_id=%s, attempts=%s)",
                    job.job_id,
                    job.attempts,
                )
            else:
                job.status = "pending"
                retry_seconds = min(30 * (2 ** (job.attempts - 1)), 3600)
                job.available_at = datetime.now(timezone.utc) + timedelta(seconds=retry_seconds)
        db.commit()
    return True


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


async def run_email_outbox_worker() -> None:
    """Poll the shared DB queue; SKIP LOCKED lets multiple replicas cooperate."""
    logger.info("Verification email outbox worker started")
    loop_count = 0
    while True:
        try:
            loop_count += 1
            processed = await asyncio.to_thread(process_one_verification_email)
            if loop_count % 1800 == 0:
                await asyncio.to_thread(cleanup_old_email_jobs)
        except Exception as exc:
            logger.error("Verification email outbox worker iteration failed (%s)", type(exc).__name__)
            processed = False
        if not processed:
            await asyncio.sleep(2)


def cleanup_old_email_jobs() -> None:
    """Bound outbox growth while retaining recent delivery diagnostics."""
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        db.query(EmailOutbox).filter(
            EmailOutbox.status.in_({"sent", "cancelled"}),
            EmailOutbox.created_at < now - timedelta(days=30),
        ).delete(synchronize_session=False)
        db.query(EmailOutbox).filter(
            EmailOutbox.status == "failed",
            EmailOutbox.created_at < now - timedelta(days=90),
        ).delete(synchronize_session=False)
        db.commit()
