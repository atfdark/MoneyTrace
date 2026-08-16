"""RecoveryCase model — Phase 7 Recovery Intelligence Engine."""

from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, String, ForeignKey, Float, Text, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RecoveryProbability(str, Enum):
    """Recovery probability classification enum."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class CaseStatus(str, Enum):
    """Recovery case status enum."""
    OPEN = "OPEN"
    ACTION_TAKEN = "ACTION_TAKEN"
    RECOVERED = "RECOVERED"
    FAILED = "FAILED"


class RecoveryCase(Base):
    """Recovery case tracking stolen asset recovery analysis and actions."""

    __tablename__ = "recovery_cases"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Human-readable case ID like REC202608160001
    case_id: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )

    # Foreign keys
    alert_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("fraud_alerts.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    transaction_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    # Recovery Intelligence fields
    recovery_score: Mapped[float] = mapped_column(
        Float, nullable=False, index=True
    )
    recovery_probability: Mapped[str] = mapped_column(
        String(20), default=RecoveryProbability.LOW.value, nullable=False, index=True
    )
    current_holder_account: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    amount_at_risk: Mapped[float] = mapped_column(
        Float, nullable=False
    )
    recommended_action: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default=CaseStatus.OPEN.value, nullable=False, index=True
    )

    # Investigator Assignment & Resolution Tracking
    assigned_to_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    assigned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    alert: Mapped["FraudAlert"] = relationship(
        "FraudAlert", foreign_keys=[alert_id], backref="recovery_cases"
    )
    transaction: Mapped["Transaction"] = relationship(
        "Transaction", foreign_keys=[transaction_id], backref="recovery_cases"
    )
    assigned_to: Mapped["User | None"] = relationship(
        "User", foreign_keys=[assigned_to_id]
    )

    def __repr__(self) -> str:
        return f"<RecoveryCase(case_id={self.case_id!r}, probability={self.recovery_probability!r}, score={self.recovery_score})>"


Index("ix_recovery_cases_prob_status", "recovery_probability", "status")
