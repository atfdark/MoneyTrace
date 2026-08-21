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

        async def get_or_create_acc(acc_num, full_name, bal, dt_offset=0):
            res_acc = await session.execute(select(Account).where(Account.account_number == acc_num))
            existing = res_acc.scalar_one_or_none()
            if existing:
                return existing
            u = User(id=uuid4(), full_name=full_name, email=f"{acc_num.lower()}_{random.randint(100,999)}@moneytrace.dev", password_hash=hash_password("Pass123"))
            session.add(u)
            await session.flush()
            acc = Account(
                id=uuid4(),
                account_number=acc_num,
                user_id=u.id,
                balance=Decimal(str(bal)),
                created_at=datetime.now(timezone.utc) - timedelta(days=dt_offset),
            )
            session.add(acc)
            await session.flush()
            return acc

        acc_victim = await get_or_create_acc("ACC1001", "Victim Alice", 500000.00)
        acc_mule1 = await get_or_create_acc("ACC1002", "Mule Bob", 100000.00, 2)
        acc_mule2 = await get_or_create_acc("ACC1003", "Mule Charlie", 100000.00, 1)
        acc_holder = await get_or_create_acc("ACC1004", "Holder David", 250000.00)

        # Clear prior seed graph transactions if present
        await session.execute(text("DELETE FROM transactions WHERE transaction_id LIKE 'TXN_TRACE_%' OR transaction_id LIKE 'TXN_RING_%' OR transaction_id LIKE 'TXN_RAND_%'"))
        await session.commit()

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
        acc_ring_a = await get_or_create_acc("ACC_RING_A", "Ring User A", 150000.00)
        acc_ring_b = await get_or_create_acc("ACC_RING_B", "Ring User B", 150000.00)
        acc_ring_c = await get_or_create_acc("ACC_RING_C", "Ring User C", 150000.00)

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
