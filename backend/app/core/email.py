import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from backend.app.core.config import get_settings

logger = logging.getLogger(__name__)

def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """
    Sends a professional Password Reset email via SMTP (e.g., Gmail).
    If SMTP credentials (SMTP_USER & SMTP_PASSWORD) are set in environment or config,
    it connects to smtp.gmail.com:587 and delivers the email directly to the recipient's inbox.
    Otherwise, it logs a warning and prints the URL to terminal.
    """
    settings = get_settings()

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.error(
            "Password reset email NOT sent to %s: SMTP_USER/SMTP_PASSWORD are not "
            "configured in backend/.env (or the deployment environment). The reset "
            "link is printed below for local development only. Reset link: %s",
            to_email,
            reset_url,
        )
        print("\n" + "═" * 65)
        print(f"📧 PASSWORD RESET LINK FOR [{to_email}]:")
        print(f"👉 {reset_url}")
        print("💡 Configure SMTP_USER and SMTP_PASSWORD in backend/.env to send real Gmail emails!")
        print("═" * 65 + "\n")
        return False

    sender_email = settings.SMTP_USER
    sender_name = settings.EMAILS_FROM_NAME

    # Create MIMEMultipart message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🔐 Reset Your Password — {settings.APP_NAME}"
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = to_email

    # Plain Text Version
    text_content = f"""
Hello,

We received a request to reset your password for your STEM Studio account.
Please click the link below to set a new password:

{reset_url}

If you did not request a password reset, you can safely ignore this email.

Best regards,
The STEM Studio Team
"""

    # Premium HTML Email Version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 30px;
    }}
    .email-card {{
      max-width: 520px;
      margin: 0 auto;
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    }}
    .brand-title {{
      font-size: 22px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
    }}
    .email-heading {{
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
    }}
    .email-text {{
      font-size: 14px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 24px;
    }}
    .reset-btn {{
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 8px;
      margin-bottom: 24px;
    }}
    .reset-link {{
      font-family: monospace;
      font-size: 12px;
      color: #38bdf8;
      word-break: break-all;
    }}
    .email-footer {{
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #334155;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="email-card">
    <div class="brand-title">🧪 STEM Studio</div>
    <div class="email-heading">Password Reset Request</div>
    <div class="email-text">
      We received a request to reset the password associated with your STEM Studio account (<strong>{to_email}</strong>).
      Click the button below to choose a new password:
    </div>
    <div>
      <a href="{reset_url}" class="reset-btn" target="_blank">Reset My Password</a>
    </div>
    <div class="email-text">
      If the button above doesn't work, copy and paste this link into your web browser:
      <br><br>
      <span class="reset-link">{reset_url}</span>
    </div>
    <div class="email-footer">
      If you did not request this, please ignore this email. Your password will remain unchanged.
    </div>
  </div>
</body>
</html>
"""

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        if settings.SMTP_TLS:
            server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(sender_email, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Password reset email successfully sent to {to_email}")
        print(f"✅ Real email successfully delivered via Gmail SMTP to [{to_email}]")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {type(e).__name__}: {e}")
        print(f"❌ Failed to send SMTP email to [{to_email}]: {e}")
        return False
