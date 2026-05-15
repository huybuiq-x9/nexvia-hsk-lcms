"""
Celery tasks — email sending runs synchronously inside the worker process.
"""
import logging
from celery_app import celery_app
from app.core.email import send_email_sync, build_password_reset_email

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def send_password_reset_email_task(self, to_email: str, reset_url: str, user_name: str) -> bool:
    subject, html_body = build_password_reset_email(reset_url, user_name)
    try:
        success = send_email_sync(to_email, subject, html_body)
    except Exception as exc:
        logger.error("[Celery] Exception sending email to %s: %s", to_email, exc)
        raise
    if not success:
        logger.warning("[Celery] Email send failed for %s — retrying", to_email)
        raise self.retry(countdown=30)
    return True
