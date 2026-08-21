"""Seed script to ensure 20 named demo accounts (ACC1001-ACC1020) exist for live presentations."""

import asyncio
import sys
from pathlib import Path
from uuid import uuid4
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.account import Account, AccountStatus
from app.database import Base

NAMED_CUSTOMERS = [
    ("Rahul Sharma", "rahul@moneytrace.dev", "ACC1001", Decimal("250000.00")),
    ("Sneha Patel", "sneha@moneytrace.dev", "ACC1002", Decimal("180000.00")),
    ("Aman Verma", "aman@moneytrace.dev", "ACC1003", Decimal("320000.00")),
    ("Priya Nair", "priya@moneytrace.dev", "ACC1004", Decimal("140000.00")),
    ("Karan Malhotra", "karan@moneytrace.dev", "ACC1005", Decimal("95000.00")),
    ("Vikram Singh", "vikram@moneytrace.dev", "ACC1006", Decimal("410000.00")),
    ("Neha Gupta", "neha@moneytrace.dev", "ACC1007", Decimal("290000.00")),
    ("Rohit Joshi", "rohit@moneytrace.dev", "ACC1008", Decimal("175000.00")),
    ("Anita Desai", "anita@moneytrace.dev", "ACC1009", Decimal("220000.00")),
    ("Rajesh Kumar", "rajesh@moneytrace.dev", "ACC1010", Decimal("380000.00")),
    ("Suresh Reddy", "suresh@moneytrace.dev", "ACC1011", Decimal("195000.00")),
    ("Pooja Shah", "pooja@moneytrace.dev", "ACC1012", Decimal("260000.00")),
    ("Sanjay Mehta", "sanjay@moneytrace.dev", "ACC1013", Decimal("310000.00")),
    ("Meera Iyer", "meera@moneytrace.dev", "ACC1014", Decimal("165000.00")),
    ("Arjun Kapoor", "arjun@moneytrace.dev", "ACC1015", Decimal("450000.00")),
    ("Deepa Sharma", "deepa@moneytrace.dev", "ACC1016", Decimal("210000.00")),
    ("Aditya Roy", "aditya@moneytrace.dev", "ACC1017", Decimal("340000.00")),
    ("Ritu Verma", "ritu@moneytrace.dev", "ACC1018", Decimal("185000.00")),
    ("Tanvi Sen", "tanvi@moneytrace.dev", "ACC1019", Decimal("275000.00")),
    ("Kunal Bose", "kunal@moneytrace.dev", "ACC1020", Decimal("500000.00")),
]


async def seed_demo_accounts():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        created_count = 0
        updated_count = 0

        for name, email, acc_num, balance in NAMED_CUSTOMERS:
            # Check user
            u_stmt = select(User).where(User.email == email)
            u_res = await session.execute(u_stmt)
            user = u_res.scalar_one_or_none()

            if not user:
                user = User(
                    id=uuid4(),
                    full_name=name,
                    email=email,
                    password_hash=hash_password("Customer@123"),
                    role=UserRole.CUSTOMER.value,
                    is_active=True,
                    is_superuser=False,
                )
                session.add(user)
                await session.flush()
                created_count += 1

            # Check account
            a_stmt = select(Account).where(Account.account_number == acc_num)
            a_res = await session.execute(a_stmt)
            account = a_res.scalar_one_or_none()

            if not account:
                account = Account(
                    id=uuid4(),
                    account_number=acc_num,
                    user_id=user.id,
                    balance=balance,
                    status=AccountStatus.ACTIVE.value,
                )
                session.add(account)
            else:
                account.user_id = user.id
                account.balance = balance
                account.status = AccountStatus.ACTIVE.value
                updated_count += 1

        await session.commit()
        print(f"[OK] Seeded 20 Demo Named Accounts (ACC1001 - ACC1020): {created_count} created, {updated_count} synced.")


if __name__ == "__main__":
    asyncio.run(seed_demo_accounts())
