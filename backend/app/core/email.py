"""SMTP delivery for account verification and password recovery."""

import html
import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from backend.app.core.config import get_settings

logger = logging.getLogger(__name__)


def smtp_is_configured() -> bool:
    """Return whether the backend has usable SMTP settings without exposing them."""
    settings = get_settings()
    return bool(settings.SMTP_HOST.strip() and settings.SMTP_USER.strip() and "".join(settings.SMTP_PASSWORD.split()))


def _smtp_password() -> str:
    # Google displays App Passwords in groups separated by spaces. Those
    # spaces are presentation only; remove them before SMTP authentication.
    return "".join(get_settings().SMTP_PASSWORD.split())


def _send_email(to_email: str, subject: str, text_content: str, html_content: str) -> bool:
    """Deliver one transactional email; never log addresses, links, or secrets."""
    settings = get_settings()
    if not smtp_is_configured():
        logger.error("SMTP delivery skipped: provider credentials are not configured")
        return False

    smtp_host = settings.SMTP_HOST.strip()
    smtp_user = settings.SMTP_USER.strip()
    sender_email = settings.EMAILS_FROM_EMAIL.strip() or smtp_user
    sender_name = " ".join(settings.EMAILS_FROM_NAME.replace("\r", " ").replace("\n", " ").split())
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = formataddr((sender_name, sender_email))
    message["To"] = to_email
    message.attach(MIMEText(text_content, "plain", "utf-8"))
    message.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            if settings.SMTP_TLS:
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
            server.login(smtp_user, _smtp_password())
            refused = server.sendmail(sender_email, [to_email], message.as_string())
            if refused:
                raise smtplib.SMTPRecipientsRefused(refused)
        logger.info("Transactional email accepted by configured SMTP provider")
        return True
    except Exception as exc:
        # SMTP response codes help an operator distinguish authentication,
        # sender policy, and transient provider failures without logging an
        # address, message body, verification URL, or credential.
        smtp_code = getattr(exc, "smtp_code", None)
        logger.error("SMTP delivery failed (%s; provider code %s)", type(exc).__name__, smtp_code or "unavailable")
        return False


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """Send a password-reset link to the account's registered email."""
    settings = get_settings()
    text_content = f"""Hello,

We received a request to reset your password for your STEM Studio account.
Open this link to choose a new password:

{reset_url}

If you did not request this, you can ignore this email.

Best regards,
The STEM Studio Team
"""
    html_content = f"""<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f7fb;color:#172033;margin:0;padding:28px">
  <main style="max-width:520px;margin:auto;background:#fff;border:1px solid #dce4ee;border-radius:14px;padding:30px">
    <p style="font-size:20px;font-weight:700;color:#176b87">STEM Studio</p>
    <h1 style="font-size:22px">Reset your password</h1>
    <p>We received a request to reset the password for your STEM Studio account.</p>
    <p><a href="{reset_url}" style="display:inline-block;padding:12px 18px;background:#176b87;color:#fff;text-decoration:none;border-radius:8px">Choose a new password</a></p>
    <p style="font-size:13px;color:#536277">If the button does not open, copy this link into your browser:<br><a href="{reset_url}">{reset_url}</a></p>
    <p style="font-size:13px;color:#536277">If you did not request this, ignore this email. Your password will remain unchanged.</p>
  </main>
</body></html>"""
    return _send_email(
        to_email,
        f"Reset your password — {settings.APP_NAME}",
        text_content,
        html_content,
    )


def send_billing_notice_email(to_email: str, subject: str, body: str) -> bool:
    """Deliver a transactional billing notice; no marketing opt-in is needed."""
    settings = get_settings()
    safe_subject = " ".join(subject.replace("\r", " ").replace("\n", " ").split())[:140]
    safe_body = body.strip()[:4000]
    escaped_subject = html.escape(safe_subject)
    escaped_body = html.escape(safe_body).replace("\n", "<br>")
    return _send_email(
        to_email,
        f"{safe_subject} — {settings.APP_NAME}",
        f"{safe_body}\n\nYour account and saved progress remain under your control. Open Billing in STEM Studio to review your plan.",
        (
            '<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f7fb;color:#172033;margin:0;padding:28px">'
            '<main style="max-width:560px;margin:auto;background:#fff;border:1px solid #dce4ee;border-radius:14px;padding:28px">'
            f'<p style="font-size:18px;font-weight:700;color:#176b87">{html.escape(settings.APP_NAME)}</p>'
            f'<h1 style="font-size:21px">{escaped_subject}</h1><p style="line-height:1.6">{escaped_body}</p>'
            '<p style="font-size:13px;color:#536277">Your account and saved progress remain under your control. Sign in and open Billing to review your plan.</p>'
            '</main></body></html>'
        ),
    )


def send_verification_email(to_email: str, verify_url: str) -> bool:
    """Send the link that proves the account holder can access this inbox."""
    settings = get_settings()
    text_content = f"""Welcome to {settings.APP_NAME}!

Verify your email address by opening this link:
{verify_url}

If you did not create this account, ignore this email.
"""
    html_content = f"""<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f7fb;color:#172033;margin:0;padding:28px">
  <main style="max-width:520px;margin:auto;background:#fff;border:1px solid #dce4ee;border-radius:14px;padding:30px">
    <p style="font-size:20px;font-weight:700;color:#176b87">STEM Studio</p>
    <h1 style="font-size:22px">Verify your email</h1>
    <p>Confirm this address to finish creating your account.</p>
    <p><a href="{verify_url}" style="display:inline-block;padding:12px 18px;background:#176b87;color:#fff;text-decoration:none;border-radius:8px">Verify email address</a></p>
    <p style="font-size:13px;color:#536277">If you did not create this account, ignore this email.</p>
  </main>
</body></html>"""
    return _send_email(
        to_email,
        f"Verify your email — {settings.APP_NAME}",
        text_content,
        html_content,
    )


def send_owner_broadcast_emails(
    recipients: list[tuple[int, str]],
    *,
    subject: str,
    body: str,
    promotional: bool,
) -> dict[int, tuple[str, str | None]]:
    """Send one private message per recipient over a single SMTP connection.

    Recipient addresses are never placed in the same message, exposed in a
    shared To/Bcc header, or written to logs. The return value contains only
    per-user status and a coarse exception category.
    """
    settings = get_settings()
    if not smtp_is_configured():
        return {user_id: ("failed", "smtp_not_configured") for user_id, _ in recipients}
    if not recipients:
        return {}

    smtp_host = settings.SMTP_HOST.strip()
    smtp_user = settings.SMTP_USER.strip()
    sender_email = settings.EMAILS_FROM_EMAIL.strip() or smtp_user
    sender_name = " ".join(settings.EMAILS_FROM_NAME.replace("\r", " ").replace("\n", " ").split())
    safe_subject = " ".join(subject.replace("\r", " ").replace("\n", " ").split())[:140]
    safe_body = body.strip()
    manage_note = (
        "To stop product and promotional email, sign in and turn it off in "
        "Settings → Account.\n\n"
        if promotional else ""
    )
    promo_html_note = (
        '<p style="font-size:12px;color:#667085">To stop product and promotional email, '
        'sign in and turn it off in Settings → Account.</p>'
        if promotional else ""
    )
    statuses: dict[int, tuple[str, str | None]] = {}
    server = None
    try:
        server = smtplib.SMTP(smtp_host, settings.SMTP_PORT, timeout=15)
        server.ehlo()
        if settings.SMTP_TLS:
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
        server.login(smtp_user, _smtp_password())
        for user_id, address in recipients:
            message = EmailMessage()
            message["Subject"] = safe_subject
            message["From"] = formataddr((sender_name, sender_email))
            message["To"] = address
            message.set_content(
                f"{safe_body}\n\n{manage_note}Best regards,\n{settings.APP_NAME}\n"
            )
            message.add_alternative(
                "<!doctype html><html><body style=\"font-family:Arial,sans-serif;line-height:1.6;"
                "color:#172033;max-width:640px;margin:24px auto;padding:24px\">"
                f"<p style=\"font-weight:700;color:#176b87\">{html.escape(settings.APP_NAME)}</p>"
                f"<h2>{html.escape(safe_subject)}</h2>"
                f"<p style=\"white-space:pre-wrap\">{html.escape(safe_body)}</p>"
                f"{promo_html_note}"
                f"<p>Best regards,<br>{html.escape(settings.APP_NAME)}</p></body></html>",
                subtype="html",
            )
            try:
                refused = server.send_message(message, from_addr=sender_email, to_addrs=[address])
                statuses[user_id] = ("failed", "recipient_refused") if refused else ("sent", None)
            except smtplib.SMTPRecipientsRefused:
                statuses[user_id] = ("failed", "recipient_refused")
            except (OSError, smtplib.SMTPException, ssl.SSLError) as exc:
                statuses[user_id] = ("failed", type(exc).__name__[:64])
                for pending_id, _ in recipients:
                    if pending_id not in statuses:
                        statuses[pending_id] = ("failed", type(exc).__name__[:64])
                break
    except (OSError, smtplib.SMTPException, ssl.SSLError) as exc:
        logger.error("Owner broadcast email delivery failed (%s)", type(exc).__name__)
        for user_id, _ in recipients:
            statuses.setdefault(user_id, ("failed", type(exc).__name__[:64]))
    finally:
        if server is not None:
            try:
                server.quit()
            except (OSError, smtplib.SMTPException):
                pass
    return statuses
