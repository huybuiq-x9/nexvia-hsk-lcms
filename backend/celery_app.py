"""
Celery application configuration.

Usage:
  # Start worker (in backend/ directory):
  celery -A celery_app worker --loglevel=info

  # Flower monitoring (optional):
  celery -A celery_app flower --port=5555
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "lcms",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.core.celery_tasks", "app.modules.scorm.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_default_queue="default",
    task_routes={
        "app.modules.scorm.tasks.process_scorm_package_task": {"queue": "scorm"},
    },
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=60,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    broker_connection_retry_on_startup=True,
)
