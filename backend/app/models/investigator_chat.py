"""InvestigatorChat model — Phase 9 AI Investigator Assistant."""

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, String, ForeignKey, Text, JSON, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InvestigatorChat(Base):
    """Stores natural language investigator queries and AI copilot responses."""

    __tablename__ = "investigator_chats"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )

    # User who asked the question
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    question: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    response: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    intent: Mapped[str] = mapped_column(
        String(50), default="GENERAL_QUERY", nullable=False, index=True
    )

    # Structured metadata for UI widgets (e.g., flow path, risk breakdown)
    context_data: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False, index=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return f"<InvestigatorChat(id={self.id}, intent={self.intent!r}, user_id={self.user_id})>"
