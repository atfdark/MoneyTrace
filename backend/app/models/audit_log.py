"""Audit Log model — Enterprise Compliance and Activity Tracking."""

from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, String, Text, Index, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditAction(str, Enum):
    """Audit action types."""
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    CASE_CREATED = "CASE_CREATED"
    CASE_UPDATED = "CASE_UPDATED"
    CASE_ASSIGNED = "CASE_ASSIGNED"
    ACCOUNT_FROZEN = "ACCOUNT_FROZEN"
    ACCOUNT_UNFROZEN = "ACCOUNT_UNFROZEN"
    REPORT_GENERATED = "REPORT_GENERATED"
    NOTE_ADDED = "NOTE_ADDED"
    EVIDENCE_UPLOADED = "EVIDENCE_UPLOADED"
    PLAYBOOK_STEP_COMPLETED = "PLAYBOOK_STEP_COMPLETED"
    PIN_SET = "PIN_SET"
    TRANSACTION_INITIATED = "TRANSACTION_INITIATED"
    WATCHLIST_ADDED = "WATCHLIST_ADDED"
    SCENARIO_STARTED = "SCENARIO_STARTED"
    SCENARIO_PAUSED = "SCENARIO_PAUSED"
    SCENARIO_RESUMED = "SCENARIO_RESUMED"
    SCENARIO_STEPPED = "SCENARIO_STEPPED"
    SCENARIO_STOPPED = "SCENARIO_STOPPED"
    SCENARIO_RESET = "SCENARIO_RESET"


class AuditLog(Base):
    """Immutable audit trail log for system and user actions."""

    __tablename__ = "audit_logs"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    user_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )
    user_name: Mapped[str] = mapped_column(
        String(255), default="System Engine", nullable=False
    )
    user_email: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    user_role: Mapped[str] = mapped_column(
        String(50), default="investigator", nullable=False
    )

    action: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    target_type: Mapped[str] = mapped_column(
        String(50), nullable=False  # CASE, ACCOUNT, TRANSACTION, ALERT, REPORT, USER
    )
    target_id: Mapped[str] = mapped_column(
        String(100), nullable=False  # e.g. CASE-2026-0801, ACC1005, TXN2026...
    )
    details: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45), default="127.0.0.1", nullable=True
    )
    user_agent: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False, index=True
    )

    def __repr__(self) -> str:
        return f"<AuditLog(action={self.action!r}, user={self.user_name!r}, target={self.target_id!r})>"
