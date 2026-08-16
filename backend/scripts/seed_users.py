#!/usr/bin/env python
"""Seed script to create admin, investigator, and customer test users with accounts."""

import asyncio
import random
import sys
from pathlib import Path
from uuid import uuid4
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add backend to path
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.account import Account, AccountStatus
from app.database import Base


# Sample customer data for variety
CUSTOMER_DATA = [
    ("Alice Johnson", "alice.johnson@moneytrace.dev"),
    ("Bob Smith", "bob.smith@moneytrace.dev"),
    ("Carol Williams", "carol.williams@moneytrace.dev"),
    ("David Brown", "david.brown@moneytrace.dev"),
    ("Eva Davis", "eva.davis@moneytrace.dev"),
    ("Frank Miller", "frank.miller@moneytrace.dev"),
    ("Grace Wilson", "grace.wilson@moneytrace.dev"),
    ("Henry Moore", "henry.moore@moneytrace.dev"),
    ("Ivy Taylor", "ivy.taylor@moneytrace.dev"),
    ("Jack Anderson", "jack.anderson@moneytrace.dev"),
    ("Karen Thomas", "karen.thomas@moneytrace.dev"),
    ("Leo Jackson", "leo.jackson@moneytrace.dev"),
    ("Mia White", "mia.white@moneytrace.dev"),
    ("Nathan Harris", "nathan.harris@moneytrace.dev"),
    ("Olivia Martin", "olivia.martin@moneytrace.dev"),
    ("Paul Thompson", "paul.thompson@moneytrace.dev"),
    ("Quinn Garcia", "quinn.garcia@moneytrace.dev"),
    ("Ruby Martinez", "ruby.martinez@moneytrace.dev"),
    ("Sam Robinson", "sam.robinson@moneytrace.dev"),
    ("Tina Clark", "tina.clark@moneytrace.dev"),
]


async def generate_unique_account_number(session) -> str:
    """Generate a unique account number like ACC12345678."""
    max_attempts = 10
    for _ in range(max_attempts):
        number = f"ACC{random.randint(10000000, 99999999):08d}"
        existing = await session.execute(
            select(Account).where(Account.account_number == number)
        )
        if existing.scalar_one_or_none() is None:
            return number
    raise Exception("Failed to generate unique account number")


async def seed_users():
    """Create test users and their accounts."""

    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL, echo=True)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session factory
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if users already exist
        existing = await session.execute(select(User))
        if existing.scalars().first():
            print("Users already exist, skipping seed")
            return

        all_users = []

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
        all_users.append(admin)

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
        all_users.append(investigator)

        # Create customer users
        customer_users = []
        for i, (name, email) in enumerate(CUSTOMER_DATA):
            customer = User(
                id=uuid4(),
                full_name=name,
                email=email,
                password_hash=hash_password("Customer123"),
                role=UserRole.CUSTOMER.value,
                is_active=True,
                is_superuser=False,
            )
            all_users.append(customer)
            customer_users.append(customer)

        session.add_all(all_users)
        await session.commit()

        # Create accounts for all users
        all_accounts = []
        for user in all_users:
            account_number = await generate_unique_account_number(session)
            # Random balance between 10,000 and 500,000 for customers
            # Admin/investigator get default 100,000
            if user.role == UserRole.CUSTOMER.value:
                balance = Decimal(str(random.randint(10000, 500000) + random.random())).quantize(Decimal("0.01"))
            else:
                balance = Decimal("100000.00")

            account = Account(
                id=uuid4(),
                account_number=account_number,
                user_id=user.id,
                balance=balance,
                status=AccountStatus.ACTIVE.value,
            )
            all_accounts.append(account)

        session.add_all(all_accounts)
        await session.commit()

        print("[OK] Created users and accounts:")
        print(f"  - 1 Admin: admin@moneytrace.dev / Admin123")
        print(f"  - 1 Investigator: investigator@moneytrace.dev / Invest123")
        print(f"  - {len(customer_users)} Customers (all password: Customer123)")
        print(f"  - Total accounts created: {len(all_accounts)}")

        # Print customer accounts for easy testing
        print("\nCustomer accounts:")
        for i, (user, account) in enumerate(zip(customer_users, all_accounts[2:])):
            print(f"  {i+1}. {user.full_name} ({user.email}) -> {account.account_number} (balance: {account.balance})")


if __name__ == "__main__":
    asyncio.run(seed_users())