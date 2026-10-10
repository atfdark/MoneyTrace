from enum import Enum
from datetime import datetime, timezone
import uuid
from typing import Optional

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Integer, Float, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class ScenarioStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    STOPPED = "stopped"
    FAILED = "failed"


class ScenarioRun(Base):
    """Tracks the state of a scenario run."""
    __tablename__ = "scenario_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_id = Column(String(100), unique=True, nullable=False, index=True)
    scenario_type = Column(String(50), nullable=False)
    
    status = Column(String(20), nullable=False, default=ScenarioStatus.IDLE.value)
    
    current_step = Column(Integer, nullable=False, default=0)
    total_steps = Column(Integer, nullable=False, default=0)
    
    # Store scenario-specific context (e.g. generated accounts, amounts)
    context_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
