import time
import json
import logging
import requests
from datetime import datetime
from .workers import celery_app
from .core.database import SessionLocal
from .models.task import TaskModel

logger = logging.getLogger(__name__)

def sanitize_payload(data):
    # Mask large payloads that may contain sensitive fields
    return "Confidential Data Masked" if len(str(data)) > 100 else data

@celery_app.task(
    name="process_heavy_data",
    bind=True,                # Enables 'self' for retry access
    autoretry_for=(Exception,), # Retry on any exception
    retry_backoff=True,       # Exponential backoff between retries
    max_retries=3             # Maximum 3 attempts
)
def process_heavy_data(self, data: str, task_id: str):
    logger.info(f"🚀 Processing Task ID: {task_id} | Payload: {sanitize_payload(data)} | (Attempt: {self.request.retries})")

    db = SessionLocal()
    start_time = time.time()

    try:
        if not data or data.strip() == "":
            raise ValueError("Empty Payload - Nothing to process")

        # --- 1. Simulation (4 seconds) ---
        time.sleep(4)

        cleaned_data = data.strip().upper()
        word_count = len(data.split())
        char_length = len(data)

        # --- 2. Analytics Calculation ---
        end_time = time.time()
        duration = round(end_time - start_time, 2)
        result_payload = {
            "status": "COMPLETED",
            "output": cleaned_data,
            "analytics": {
                "word_count": word_count,
                "char_length": char_length,
                "duration_seconds": duration
            }
        }

        # --- 3. Database Update ---
        db_task = db.query(TaskModel).filter(TaskModel.task_id == task_id).first()
        if db_task:
            db_task.status = "SUCCESS"
            db_task.result = result_payload

            db_task.word_count = word_count
            db_task.processing_time = duration

            db.commit()
            logger.info(f"✅ Task {task_id} persisted: {word_count} words in {duration}s")

            # --- 4. Signal to Frontend ---
            try:
                requests.post(f"http://app:8000/ws-internal/notify/{task_id}?status=SUCCESS", timeout=5)
            except Exception as e:
                logger.error(f"📡 WS Signal Failed: {e}")

    except Exception as exc:
        if self.request.retries >= self.max_retries:
            # Max retries exceeded — move to dead letter queue
            update_db_error(db, task_id, {"error": str(exc), "status": "DLQ_FAILED"})
        else:
            # Notify frontend of retry attempt
            try:
                requests.post(f"http://app:8000/ws-internal/notify/{task_id}?status=RETRYING", timeout=2)
            except:
                pass
        raise exc

    finally:
        db.close()

def update_db_error(db, task_id, error_data):
    db_task = db.query(TaskModel).filter(TaskModel.task_id == task_id).first()
    if db_task:
        db_task.status = "FAILURE"
        db_task.result = error_data
        db.commit()