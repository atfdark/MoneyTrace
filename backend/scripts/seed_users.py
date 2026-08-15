#!/usr/bin/env python
"""Seed script to create admin, investigator, and customer test users."""

import asyncio
import sys
from pathlib import Path
from uuid import uuid4

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add backend to path
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.database import Base


async def seed_users():
    """Create three test users for development."""
    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL, echo=True)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session factory
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if users already exist
        from sqlalchemy import select
        existing = await session.execute(select(User))
        if existing.scalars().first():
            print("Users already exist, skipping seed")
            return

        # Create admin user
        admin = User(
            id=uuid4(),
            full_name="Admin User",
            email="admin@moneytrace.dev",
            password_hash=hash_password("Admin123"),
            role=UserRole.ADMIN.value,
            is_active=True,
            is_superuser=True,
        )

        # Create investigator user
        investigator = User(
            id=uuid4(),
            full_name="Investigator User",
            email="investigator@moneytrace.dev",
            password_hash=hash_password("Invest123"),
            role=UserRole.INVESTIGATOR.value,
            is_active=True,
            is_superuser=False,
        )

        # Create customer user
        customer = User(
            id=uuid4(),
            full_name="Customer User",
            email="customer@moneytrace.dev",
            password_hash=hash_password("Customer123"),
            role=UserRole.CUSTOMER.value,
            is_active=True,
            is_superuser=False,
        )

        session.add_all([admin, investigator, customer])
        await session.commit()

        print("[OK] Created 3 test users:")
        print(f"  - admin@moneytrace.dev / Admin123 (role: admin)")
        print(f"  - investigator@moneytrace.dev / Invest123 (role: investigator)")
        print(f"  - customer@moneytrace.dev / Customer123 (role: customer)")


if __name__ == "__main__":
    asyncio.run(seed_users())