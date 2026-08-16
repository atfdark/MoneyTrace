"""Transaction model — Phase 4 Banking Simulator."""

from datetime import datetime, timezone
from uuid import UUID, uuid4
from decimal import Decimal
from enum import Enum

from sqlalchemy import Column, DateTime, String, ForeignKey, DECIMAL, Float, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TransactionStatus(str, Enum):
    """Transaction status enum."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REVERSED = "reversed"


class Transaction(Base):
    """Transaction between two accounts."""

    __tablename__ = "transactions"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Human-readable transaction ID like TXN20240115123456789
    transaction_id: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )

    # Sender and receiver accounts
    sender_account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    receiver_account_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )

    # Transaction amount
    amount: Mapped[Decimal] = mapped_column(
        DECIMAL(18, 2), nullable=False
    )

    # Optional remark
    remark: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default=TransactionStatus.COMPLETED.value, nullable=False
    )

    # Future fields for fraud detection (Phase 5+)
    device_info: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45), nullable=True  # IPv6 max length
    )
    location: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    risk_score: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    is_flagged: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    # Timestamp
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    sender_account: Mapped["Account"] = relationship(
        "Account", foreign_keys=[sender_account_id], back_populates="sent_transactions"
    )
    receiver_account: Mapped["Account"] = relationship(
        "Account", foreign_keys=[receiver_account_id], back_populates="received_transactions"
    )

    def __repr__(self) -> str:
        return f"<Transaction(transaction_id={self.transaction_id!r}, amount={self.amount}, status={self.status})>"


# Add indexes for common queries
Index("ix_transactions_sender_timestamp", "sender_account_id", "timestamp")
Index("ix_transactions_receiver_timestamp", "receiver_account_id", "timestamp")
Index("ix_transactions_status_timestamp", "status", "timestamp")