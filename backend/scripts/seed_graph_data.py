#!/usr/bin/env python
"""Seed script for Phase 6 – Money Flow Graph Networks & Multi-Hop Trails."""

import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.core.security import hash_password
from app.database import Base
from app.models.account import Account, AccountStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User, UserRole
from app.services.fraud_service import FraudService
from scripts.seed_users import generate_unique_account_number


async def seed_graph_data():
    """Seed multi-hop money flow networks and circular laundering chains."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE fraud_alerts ADD COLUMN rule_breakdown JSON"))
        except Exception:
            pass

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        fraud_service = FraudService(session)

        print("Seeding Phase 6 Multi-Hop Money Flow Graph Data...")

        # ------------------------------------------------------------------
        # SCENARIO A: Multi-Hop Money Flow Trail
        # ACC_VICTIM_101 -> ACC_MULE_102 -> ACC_MULE_103 -> ACC_HOLDER_104
        # ------------------------------------------------------------------
        u_victim = User(id=uuid4(), full_name="Victim Alice", email=f"victim_{random.randint(100,999)}@moneytrace.dev", password_hash=hash_password("Pass123"))
        u_mule1 = User(id=uuid4(), full_name="Mule Bob", email=f"mule1_{random.randint(100,999)}@moneytrace.dev", password_hash=hash_password("Pass123"))
        u_mule2 = User(id=uuid4(), full_name="Mule Charlie", email=f"mule2_{random.randint(100,999)}@moneytrace.dev", password_hash=hash_password("Pass123"))
        u_holder = User(id=uuid4(), full_name="Holder David", email=f"holder_{random.randint(100,999)}@moneytrace.dev", password_hash=hash_password("Pass123"))
        session.add_all([u_victim, u_mule1, u_mule2, u_holder])
        await session.flush()

        acc_victim = Account(id=uuid4(), account_number="ACC1001", user_id=u_victim.id, balance=Decimal("500000.00"))
        acc_mule1 = Account(id=uuid4(), account_number="ACC1002", user_id=u_mule1.id, balance=Decimal("100000.00"), created_at=datetime.now(timezone.utc) - timedelta(days=2))
        acc_mule2 = Account(id=uuid4(), account_number="ACC1003", user_id=u_mule2.id, balance=Decimal("100000.00"), created_at=datetime.now(timezone.utc) - timedelta(days=1))
        acc_holder = Account(id=uuid4(), account_number="ACC1004", user_id=u_holder.id, balance=Decimal("250000.00"))
        session.add_all([acc_victim, acc_mule1, acc_mule2, acc_holder])
        await session.flush()

        base_t = datetime.now(timezone.utc) - timedelta(hours=2)

        # Hop 1: ACC1001 -> ACC1002 (INR 100,000)
        t_hop1 = Transaction(
            id=uuid4(),
            transaction_id="TXN_TRACE_HOP1",
            sender_account_id=acc_victim.id,
            receiver_account_id=acc_mule1.id,
            amount=Decimal("100000.00"),
            remark="Phishing scam payment",
            status=TransactionStatus.COMPLETED.value,
            timestamp=base_t,
        )
        session.add(t_hop1)
        await session.flush()
        await fraud_service.analyze_and_alert_transaction(t_hop1, sender_account=acc_victim)

        # Hop 2: ACC1002 -> ACC1003 (INR 98,000) 10 mins later
        t_hop2 = Transaction(
            id=uuid4(),
            transaction_id="TXN_TRACE_HOP2",
            sender_account_id=acc_mule1.id,
            receiver_account_id=acc_mule2.id,
            amount=Decimal("98000.00"),
            remark="Pass through transfer 1",
            status=TransactionStatus.COMPLETED.value,
            timestamp=base_t + timedelta(minutes=10),
        )
        session.add(t_hop2)
        await session.flush()
        await fraud_service.analyze_and_alert_transaction(t_hop2, sender_account=acc_mule1, sender_balance_before=Decimal("100000.00"))

        # Hop 3: ACC1003 -> ACC1004 (INR 95,000) 15 mins later
        t_hop3 = Transaction(
            id=uuid4(),
            transaction_id="TXN_TRACE_HOP3",
            sender_account_id=acc_mule2.id,
            receiver_account_id=acc_holder.id,
            amount=Decimal("95000.00"),
            remark="Pass through transfer 2 to final holder",
            status=TransactionStatus.COMPLETED.value,
            timestamp=base_t + timedelta(minutes=25),
        )
        session.add(t_hop3)
        await session.flush()
        await fraud_service.analyze_and_alert_transaction(t_hop3, sender_account=acc_mule2, sender_balance_before=Decimal("98000.00"))

        print("  - Created Hop Trail: ACC1001 -> ACC1002 -> ACC1003 -> ACC1004")

        # ------------------------------------------------------------------
        # SCENARIO B: Circular Money Laundering Ring
        # ACC_RING_A -> ACC_RING_B -> ACC_RING_C -> ACC_RING_A
        # ------------------------------------------------------------------
        u_ring_a = User(id=uuid4(), full_name="Ring User A", email=f"ring_a_{random.randint(100,999)}@moneytrace.dev", password_hash=hash_password("Pass123"))
        u_ring_b = User(id=uuid4(), full_name="Ring User B", email=f"ring_b_{random.randint(100,999)}@moneytrace.dev", password_hash=hash_password("Pass123"))
        u_ring_c = User(id=uuid4(), full_name="Ring User C", email=f"ring_c_{random.randint(100,999)}@moneytrace.dev", password_hash=hash_password("Pass123"))
        session.add_all([u_ring_a, u_ring_b, u_ring_c])
        await session.flush()

        acc_ring_a = Account(id=uuid4(), account_number="ACC_RING_A", user_id=u_ring_a.id, balance=Decimal("150000.00"))
        acc_ring_b = Account(id=uuid4(), account_number="ACC_RING_B", user_id=u_ring_b.id, balance=Decimal("150000.00"))
        acc_ring_c = Account(id=uuid4(), account_number="ACC_RING_C", user_id=u_ring_c.id, balance=Decimal("150000.00"))
        session.add_all([acc_ring_a, acc_ring_b, acc_ring_c])
        await session.flush()

        t_ring_1 = Transaction(
            id=uuid4(),
            transaction_id="TXN_RING_AB",
            sender_account_id=acc_ring_a.id,
            receiver_account_id=acc_ring_b.id,
            amount=Decimal("50000.00"),
            remark="Ring leg 1",
            status=TransactionStatus.COMPLETED.value,
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=40),
        )
        t_ring_2 = Transaction(
            id=uuid4(),
            transaction_id="TXN_RING_BC",
            sender_account_id=acc_ring_b.id,
            receiver_account_id=acc_ring_c.id,
            amount=Decimal("48000.00"),
            remark="Ring leg 2",
            status=TransactionStatus.COMPLETED.value,
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=30),
        )
        t_ring_3 = Transaction(
            id=uuid4(),
            transaction_id="TXN_RING_CA",
            sender_account_id=acc_ring_c.id,
            receiver_account_id=acc_ring_a.id,
            amount=Decimal("46000.00"),
            remark="Ring leg 3 (complete cycle)",
            status=TransactionStatus.COMPLETED.value,
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=20),
        )
        session.add_all([t_ring_1, t_ring_2, t_ring_3])
        await session.flush()

        await fraud_service.analyze_and_alert_transaction(t_ring_1, sender_account=acc_ring_a)
        await fraud_service.analyze_and_alert_transaction(t_ring_2, sender_account=acc_ring_b)
        await fraud_service.analyze_and_alert_transaction(t_ring_3, sender_account=acc_ring_c)

        print("  - Created Circular Ring: ACC_RING_A -> ACC_RING_B -> ACC_RING_C -> ACC_RING_A")

        await session.commit()
        print("\n[OK] Phase 6 Money Flow Graph test networks successfully seeded!")


if __name__ == "__main__":
    asyncio.run(seed_graph_data())
