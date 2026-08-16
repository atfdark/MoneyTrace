"""Account model — Phase 4 Banking Simulator."""

from datetime import datetime, timezone
from uuid import UUID, uuid4
from decimal import Decimal
from enum import Enum
from typing import List

from sqlalchemy import Column, DateTime, String, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AccountStatus(str, Enum):
    """Account status enum."""
    ACTIVE = "active"
    FROZEN = "frozen"
    CLOSED = "closed"


class Account(Base):
    """Bank account for a user."""

    __tablename__ = "accounts"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # Unique account number like ACC12345678
    account_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )

    # Owner
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    # Balance stored as DECIMAL for precision
    balance: Mapped[Decimal] = mapped_column(
        DECIMAL(18, 2), default=Decimal("100000.00"), nullable=False
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(20), default=AccountStatus.ACTIVE.value, nullable=False
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="accounts")
    sent_transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction", foreign_keys="Transaction.sender_account_id", back_populates="sender_account"
    )
    received_transactions: Mapped[List["Transaction"]] = relationship(
        "Transaction", foreign_keys="Transaction.receiver_account_id", back_populates="receiver_account"
    )

    def __repr__(self) -> str:
        return f"<Account(account_number={self.account_number!r}, balance={self.balance}, status={self.status})>"