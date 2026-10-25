"""Branded transactional email via Resend's HTTPS API or authenticated SMTP."""

import html
import base64
import hashlib
import logging
import re
import smtplib
import socket
import ssl
from contextlib import contextmanager
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from cryptography.fernet import Fernet
import httpx

from backend.app.core.config import get_settings

logger = logging.getLogger(__name__)

_EMAIL_ADDRESS_RE = re.compile(r"^[^@\s<>]+@(?:[^@\s.]+\.)+[^@\s.]+$")


def _sender_details(settings) -> tuple[str, str, str]:
    """Return the configured branded sender identity and optional reply-to."""
    smtp_user = str(getattr(settings, "SMTP_USER", "") or "").strip()
    configured_sender = str(getattr(settings, "EMAILS_FROM_EMAIL", "") or "").strip()
    sender_email = configured_sender or (smtp_user if _EMAIL_ADDRESS_RE.fullmatch(smtp_user) else "")
    sender_name = " ".join(
        str(getattr(settings, "EMAILS_FROM_NAME", "STEM Studio") or "STEM Studio")
        .replace("\r", " ").replace("\n", " ").split()
    )[:120]
    reply_to = str(getattr(settings, "EMAILS_REPLY_TO", "") or "").strip()

    if not _EMAIL_ADDRESS_RE.fullmatch(sender_email):
        sender_email = ""
    if not _EMAIL_ADDRESS_RE.fullmatch(reply_to):
        reply_to = ""
    return sender_name, sender_email, reply_to


def _app_name(settings) -> str:
    return str(getattr(settings, "APP_NAME", "STEM Studio") or "STEM Studio")


def _set_sender_headers(message, settings) -> str:
    """Apply the same sender identity to every email category."""
    sender_name, sender_email, reply_to = _sender_details(settings)
    if sender_email:
        message["From"] = formataddr((sender_name, sender_email))
    if reply_to:
        message["Reply-To"] = reply_to
    return sender_email


def email_delivery_is_configured() -> bool:
    """Return whether the selected provider and branded sender are configured."""
    settings = get_settings()
    _, sender_email, _ = _sender_details(settings)
    provider = str(getattr(settings, "EMAIL_PROVIDER", "smtp") or "smtp").strip().lower()
    if provider == "resend":
        return bool(
            str(getattr(settings, "RESEND_API_KEY", "") or "").strip()
            and sender_email
        )
    if provider != "smtp":
        return False
    smtp_host = str(getattr(settings, "SMTP_HOST", "") or "").strip()
    smtp_user = str(getattr(settings, "SMTP_USER", "") or "").strip()
    smtp_password = "".join(str(getattr(settings, "SMTP_PASSWORD", "") or "").split())
    return bool(
        smtp_host
        and smtp_user
        and smtp_password
        and sender_email
    )


def smtp_is_configured() -> bool:
    """Backward-compatible alias for the email provider readiness check."""
    return email_delivery_is_configured()


def _smtp_password() -> str:
    # Google displays App Passwords in groups separated by spaces. Those
    # spaces are presentation only; remove them before SMTP authentication.
    return "".join(get_settings().SMTP_PASSWORD.split())


def encrypt_verification_token(token: str) -> str:
    """Encrypt the short-lived bearer token before placing it in the DB outbox.

    A domain-separated key is derived from the stable server JWT secret, so
    every API replica can work the same queue without adding another secret.
    Production settings already require this secret to be strong and stable.
    """
    settings = get_settings()
    key_material = hashlib.sha256(
        b"stem-studio/email-outbox/v1\0" + settings.JWT_SECRET_KEY.encode("utf-8")
    ).digest()
    fernet_key = base64.urlsafe_b64encode(key_material)
    return Fernet(fernet_key).encrypt(token.encode("utf-8")).decode("ascii")


def decrypt_verification_token(encrypted_token: str) -> str:
    settings = get_settings()
    key_material = hashlib.sha256(
        b"stem-studio/email-outbox/v1\0" + settings.JWT_SECRET_KEY.encode("utf-8")
    ).digest()
    fernet_key = base64.urlsafe_b64encode(key_material)
    return Fernet(fernet_key).decrypt(encrypted_token.encode("ascii")).decode("utf-8")


@contextmanager
def _smtp_server(settings):
    """Open SMTP with implicit TLS on 465 or STARTTLS on configured ports."""
    if settings.SMTP_USE_SSL or settings.SMTP_PORT == 465:
        server = smtplib.SMTP_SSL(
            settings.SMTP_HOST.strip(), settings.SMTP_PORT,
            timeout=10, context=ssl.create_default_context(),
        )
    else:
        server = smtplib.SMTP(settings.SMTP_HOST.strip(), settings.SMTP_PORT, timeout=10)
    try:
        server.ehlo()
        if settings.SMTP_TLS and not (settings.SMTP_USE_SSL or settings.SMTP_PORT == 465):
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
        yield server
    finally:
        try:
            server.quit()
        except (OSError, smtplib.SMTPException):
            pass


def _smtp_error_category(exc: Exception) -> tuple[str, int | None]:
    """Reduce provider errors to safe operator diagnostics (no email/body data)."""
    code = getattr(exc, "smtp_code", None)
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return "authentication_rejected", code
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return "recipient_rejected", code
    if isinstance(exc, smtplib.SMTPSenderRefused):
        return "sender_rejected", code
    if isinstance(exc, ssl.SSLError):
        return "tls_error", code
    if isinstance(exc, (TimeoutError, socket.timeout)):
        return "connection_timeout", code
    if isinstance(exc, socket.gaierror):
        return "host_resolution_error", code
    if isinstance(exc, smtplib.SMTPResponseException):
        return ("provider_temporary_rejection" if code and code < 500 else "provider_rejection"), code
    if isinstance(exc, OSError):
        return "connection_error", code
    if isinstance(exc, smtplib.SMTPException):
        return "smtp_protocol_error", code
    return "unexpected_delivery_error", code


def _resend_send(
    client: httpx.Client,
    *,
    to_email: str,
    subject: str,
    text_content: str,
    html_content: str,
    settings,
    idempotency_key: str | None = None,
) -> tuple[bool, str | None, int | None]:
    """Send through Resend over HTTPS so this works on Render Free instances."""
    sender_name, sender_email, reply_to = _sender_details(settings)
    payload = {
        "from": formataddr((sender_name, sender_email)),
        "to": [to_email],
        "subject": subject,
        "text": text_content,
        "html": html_content,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    headers = {"Authorization": f"Bearer {settings.RESEND_API_KEY.strip()}"}
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key[:256]
    try:
        response = client.post(
            "https://api.resend.com/emails",
            headers=headers,
            json=payload,
        )
    except httpx.TimeoutException:
        return False, "provider_timeout", None
    except httpx.RequestError:
        return False, "provider_connection_error", None

    if response.is_success:
        return True, None, response.status_code
    category = (
        "provider_temporary_rejection"
        if response.status_code == 429 or response.status_code >= 500
        else "provider_rejection"
    )
    return False, category, response.status_code


def _send_email(
    to_email: str,
    subject: str,
    text_content: str,
    html_content: str,
    *,
    idempotency_key: str | None = None,
) -> bool:
    """Deliver one transactional email; never log addresses, links, or secrets."""
    settings = get_settings()
    if not email_delivery_is_configured():
        logger.error("Email delivery skipped: provider credentials or sender identity are not configured")
        return False

    provider = str(getattr(settings, "EMAIL_PROVIDER", "smtp") or "smtp").strip().lower()
    if provider == "resend":
        with httpx.Client(timeout=httpx.Timeout(10.0, connect=4.0)) as client:
            sent, category, provider_code = _resend_send(
                client,
                to_email=to_email,
                subject=subject,
                text_content=text_content,
                html_content=html_content,
                settings=settings,
                idempotency_key=idempotency_key,
            )
        if sent:
            logger.info("Transactional email accepted by configured HTTPS provider")
            return True
        logger.error(
            "HTTPS email delivery failed (%s; provider code %s)",
            category or "unknown_error",
            provider_code or "unavailable",
        )
        return False

    smtp_user = settings.SMTP_USER.strip()
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    sender_email = _set_sender_headers(message, settings)
    if not sender_email:
        logger.error("Email delivery skipped: a valid EMAILS_FROM_EMAIL is required")
        return False
    message["To"] = to_email
    message.attach(MIMEText(text_content, "plain", "utf-8"))
    message.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        with _smtp_server(settings) as server:
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
        category, smtp_code = _smtp_error_category(exc)
        logger.error("SMTP delivery failed (%s; provider code %s)", category, smtp_code or "unavailable")
        return False


def send_password_reset_email(
    to_email: str,
    reset_url: str,
    *,
    idempotency_key: str | None = None,
) -> bool:
    """Send a password-reset link to the account's registered email."""
    settings = get_settings()
    safe_reset_url = html.escape(reset_url, quote=True)
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
    <p><a href="{safe_reset_url}" style="display:inline-block;padding:12px 18px;background:#176b87;color:#fff;text-decoration:none;border-radius:8px">Choose a new password</a></p>
    <p style="font-size:13px;color:#536277">If the button does not open, copy this link into your browser:<br><a href="{safe_reset_url}">{safe_reset_url}</a></p>
    <p style="font-size:13px;color:#536277">If you did not request this, ignore this email. Your password will remain unchanged.</p>
  </main>
</body></html>"""
    return _send_email(
        to_email,
        f"Reset your password — {_app_name(settings)}",
        text_content,
        html_content,
        idempotency_key=idempotency_key,
    )


def send_billing_notice_email(
    to_email: str,
    subject: str,
    body: str,
    *,
    idempotency_key: str | None = None,
) -> bool:
    """Deliver a transactional billing notice; no marketing opt-in is needed."""
    settings = get_settings()
    safe_subject = " ".join(subject.replace("\r", " ").replace("\n", " ").split())[:140]
    safe_body = body.strip()[:4000]
    escaped_subject = html.escape(safe_subject)
    escaped_body = html.escape(safe_body).replace("\n", "<br>")
    return _send_email(
        to_email,
        f"{safe_subject} — {_app_name(settings)}",
        f"{safe_body}\n\nYour account and saved progress remain under your control. Open Billing in STEM Studio to review your plan.",
        (
            '<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f7fb;color:#172033;margin:0;padding:28px">'
            '<main style="max-width:560px;margin:auto;background:#fff;border:1px solid #dce4ee;border-radius:14px;padding:28px">'
            f'<p style="font-size:18px;font-weight:700;color:#176b87">{html.escape(_app_name(settings))}</p>'
            f'<h1 style="font-size:21px">{escaped_subject}</h1><p style="line-height:1.6">{escaped_body}</p>'
            '<p style="font-size:13px;color:#536277">Your account and saved progress remain under your control. Sign in and open Billing to review your plan.</p>'
            '</main></body></html>'
        ),
        idempotency_key=idempotency_key,
    )


def send_verification_email(
    to_email: str,
    verify_url: str,
    *,
    idempotency_key: str | None = None,
) -> bool:
    """Send the link that proves the account holder can access this inbox."""
    settings = get_settings()
    safe_verify_url = html.escape(verify_url, quote=True)
    text_content = f"""Welcome to {_app_name(settings)}!

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
    <p><a href="{safe_verify_url}" style="display:inline-block;padding:12px 18px;background:#176b87;color:#fff;text-decoration:none;border-radius:8px">Verify email address</a></p>
    <p style="font-size:13px;color:#536277">If you did not create this account, ignore this email.</p>
  </main>
</body></html>"""
    return _send_email(
        to_email,
        f"Verify your email — {_app_name(settings)}",
        text_content,
        html_content,
        idempotency_key=idempotency_key,
    )


def send_owner_broadcast_emails(
    recipients: list[tuple[int, str]],
    *,
    subject: str,
    body: str,
    promotional: bool,
    idempotency_prefix: str | None = None,
) -> dict[int, tuple[str, str | None]]:
    """Send one private message per recipient through the configured provider.

    Recipient addresses are never placed in the same message, exposed in a
    shared To/Bcc header, or written to logs. The return value contains only
    per-user status and a coarse exception category.
    """
    settings = get_settings()
    if not email_delivery_is_configured():
        return {user_id: ("failed", "email_provider_not_configured") for user_id, _ in recipients}
    if not recipients:
        return {}

    smtp_user = settings.SMTP_USER.strip()
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

    if str(getattr(settings, "EMAIL_PROVIDER", "smtp") or "smtp").strip().lower() == "resend":
        try:
            with httpx.Client(timeout=httpx.Timeout(10.0, connect=4.0)) as client:
                for user_id, address in recipients:
                    text_content = (
                        f"{safe_body}\n\n{manage_note}Best regards,\n{_app_name(settings)}\n"
                    )
                    html_content = (
                        '<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;'
                        'color:#172033;max-width:640px;margin:24px auto;padding:24px">'
                        f"<p style=\"font-weight:700;color:#176b87\">{html.escape(_app_name(settings))}</p>"
                        f"<h2>{html.escape(safe_subject)}</h2>"
                        f"<p style=\"white-space:pre-wrap\">{html.escape(safe_body)}</p>"
                        f"{promo_html_note}"
                        f"<p>Best regards,<br>{html.escape(_app_name(settings))}</p></body></html>"
                    )
                    sent, category, provider_code = _resend_send(
                        client,
                        to_email=address,
                        subject=safe_subject,
                        text_content=text_content,
                        html_content=html_content,
                        settings=settings,
                        idempotency_key=(
                            f"{idempotency_prefix}:{user_id}"
                            if idempotency_prefix else None
                        ),
                    )
                    if sent:
                        statuses[user_id] = ("sent", None)
                    else:
                        statuses[user_id] = (
                            "failed",
                            f"{category or 'provider_rejection'}_{provider_code}"
                            if provider_code else category or "provider_connection_error",
                        )
        except Exception as exc:
            # Do not log recipient addresses, message bodies, provider response
            # bodies, or API credentials.
            logger.error("Owner email batch failed (%s)", type(exc).__name__)
            for user_id, _ in recipients:
                statuses.setdefault(user_id, ("failed", "provider_batch_error"))
        return statuses

    server = None
    try:
        server_context = _smtp_server(settings)
        server = server_context.__enter__()
        server.login(smtp_user, _smtp_password())
        for user_id, address in recipients:
            message = EmailMessage()
            message["Subject"] = safe_subject
            sender_email = _set_sender_headers(message, settings)
            if not sender_email:
                statuses[user_id] = ("failed", "sender_not_configured")
                continue
            message["To"] = address
            message.set_content(
                f"{safe_body}\n\n{manage_note}Best regards,\n{_app_name(settings)}\n"
            )
            message.add_alternative(
                "<!doctype html><html><body style=\"font-family:Arial,sans-serif;line-height:1.6;"
                "color:#172033;max-width:640px;margin:24px auto;padding:24px\">"
                f"<p style=\"font-weight:700;color:#176b87\">{html.escape(_app_name(settings))}</p>"
                f"<h2>{html.escape(safe_subject)}</h2>"
                f"<p style=\"white-space:pre-wrap\">{html.escape(safe_body)}</p>"
                f"{promo_html_note}"
                f"<p>Best regards,<br>{html.escape(_app_name(settings))}</p></body></html>",
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
        category, smtp_code = _smtp_error_category(exc)
        logger.error("Owner broadcast email delivery failed (%s; provider code %s)", category, smtp_code or "unavailable")
        for user_id, _ in recipients:
            statuses.setdefault(user_id, ("failed", type(exc).__name__[:64]))
    finally:
        if server is not None:
            server_context.__exit__(None, None, None)
    return statuses
