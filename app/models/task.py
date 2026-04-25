from sqlalchemy import Column, String, Integer, DateTime, JSON
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base
import datetime

class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True) # Celery's ID
    status = Column(String, default="PENDING")       # PENDING, SUCCESS, FAILURE
    task_type = Column(String)                       # PDF or EMAIL
    data = Column(JSON)                              # Payload
    result = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)