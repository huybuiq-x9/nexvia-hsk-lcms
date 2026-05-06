import logging
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import aiosmtplib
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> bool:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("[Email] SMTP not configured — skipping email to %s", to_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(text_body or html_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=settings.SMTP_USE_TLS,
            timeout=15,
        )
        logger.info("[Email] Sent to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("[Email] Failed to send to %s: %s", to_email, exc)
        return False


def build_password_reset_email(reset_url: str, user_name: str) -> tuple[str, str]:
    subject = "HSK LCMS — Đặt lại mật khẩu"
    text = (
        f"Xin chào {user_name},\n\n"
        f"Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản HSK LCMS.\n"
        f"Nhấn vào liên kết bên dưới để đặt lại mật khẩu mới:\n\n"
        f"{reset_url}\n\n"
        f"Liên kết này có hiệu lực trong 15 phút.\n"
        f"Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n"
    )
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {{ font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }}
        .container {{ background: #ffffff; border-radius: 8px; padding: 32px; max-width: 520px; margin: auto; }}
        .logo {{ font-size: 22px; font-weight: bold; color: #1d4ed8; margin-bottom: 24px; }}
        .title {{ font-size: 18px; font-weight: bold; color: #111827; margin-bottom: 16px; }}
        .text {{ color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 20px; }}
        .footer {{ margin-top: 28px; font-size: 12px; color: #9ca3af; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">HSK LCMS</div>
        <div class="title">Xin chào {user_name},</div>
        <div class="text">Nhấn vào <a href="{reset_url}">liên kết này</a> để đặt lại mật khẩu.</div>
        <div class="text" style="margin-top:20px">
          Liên kết này có hiệu lực trong <strong>15 phút</strong>.<br/>
          Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </div>
        <div class="footer">
          HSK LCMS — Hệ thống Quản lý Nội dung Học tập<br/>
          Email này được gửi tự động, vui lòng không trả lời.
        </div>
      </div>
    </body>
    </html>
    """
    return subject, html
