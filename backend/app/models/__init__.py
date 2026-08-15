"""Database models package — imports all models for Alembic autogenerate."""

from app.database import Base
from app.models.user import User, UserRole

__all__ = ["Base", "User", "UserRole"]
