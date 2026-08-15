"""Database configuration and session management for SQLAlchemy 2.0."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    future=True,
)

# Async session factory
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base model for all database models."""

    pass


async def get_session() -> AsyncSession:
    """Get database session for dependency injection."""
    async with async_session() as session:
        yield session


# SessionLocal alias for compatibility
SessionLocal = async_session
