#!/usr/bin/env python
"""Seed script for Phase 5 – Suspicious Transactions & Fraud Alerts."""

import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add backend to path
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.core.security import hash_password
from app.database import Base
from app.models.account import Account, AccountStatus
from app.models.fraud_alert import FraudAlert
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User, UserRole
from app.services.fraud_service import FraudService
from scripts.seed_users import seed_users, generate_unique_account_number


async def seed_suspicious_data():
    """Seed suspicious transaction scenarios and trigger fraud alerts."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        try:
            await conn.execute(text("ALTER TABLE fraud_alerts ADD COLUMN rule_breakdown JSON"))
        except Exception:
            pass

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 1. Ensure users and accounts exist
        res = await session.execute(select(Account))
        accounts = list(res.scalars().all())

        if len(accounts) < 4:
            print("Not enough accounts found, running seed_users standard seed first...")
            await session.close()
            await seed_users()
            async with async_session() as session2:
                res = await session2.execute(select(Account))
                accounts = list(res.scalars().all())
                session = session2

        print(f"Using {len(accounts)} existing bank accounts for suspicious scenario seeding...")

        fraud_service = FraudService(session)

        # ------------------------------------------------------------------
        # SCENARIO 1: Large Transaction (Rule 1: > ₹50,000)
        # ------------------------------------------------------------------
        acc_sender_1 = accounts[0]
        acc_recv_1 = accounts[1]

        txn1 = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_LARGE_{random.randint(1000, 9999)}",
            sender_account_id=acc_sender_1.id,
            receiver_account_id=acc_recv_1.id,
            amount=Decimal("65000.00"),
            remark="High value equipment purchase",
            status=TransactionStatus.COMPLETED.value,
            ip_address="192.168.1.45",
            device_info="iPhone 14 Pro",
            timestamp=datetime.now(timezone.utc) - timedelta(hours=3),
        )
        session.add(txn1)
        await session.flush()
        res1, alert1 = await fraud_service.analyze_and_alert_transaction(txn1, sender_account=acc_sender_1)
        print(f"Scenario 1 (Large Txn INR 65k) -> Risk Score: {res1.risk_score}, Severity: {res1.severity.value}, Rules: {res1.triggered_rules}")

        # ------------------------------------------------------------------
        # SCENARIO 2: Very Large Txn + New Account (Rule 2 + Rule 4: ₹120,000)
        # ------------------------------------------------------------------
        # Create a brand new account created today
        new_user = User(
            id=uuid4(),
            full_name="Suspicious New Customer",
            email=f"suspicious_new_{random.randint(100, 999)}@moneytrace.dev",
            password_hash=hash_password("Customer123"),
            role=UserRole.CUSTOMER.value,
            is_active=True,
        )
        session.add(new_user)
        await session.flush()

        new_acc_num = await generate_unique_account_number(session)
        new_account = Account(
            id=uuid4(),
            account_number=new_acc_num,
            user_id=new_user.id,
            balance=Decimal("250000.00"),
            status=AccountStatus.ACTIVE.value,
            created_at=datetime.now(timezone.utc) - timedelta(days=2),  # 2 days old (< 7 days)
        )
        session.add(new_account)
        await session.flush()

        txn2 = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_VERYLARGE_{random.randint(1000, 9999)}",
            sender_account_id=new_account.id,
            receiver_account_id=accounts[2].id,
            amount=Decimal("120000.00"),
            remark="Immediate wire transfer",
            status=TransactionStatus.COMPLETED.value,
            ip_address="185.220.101.5",
            device_info="Unknown Chrome/Linux",
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=45),
        )
        session.add(txn2)
        await session.flush()
        res2, alert2 = await fraud_service.analyze_and_alert_transaction(txn2, sender_account=new_account)
        print(f"Scenario 2 (INR 120k from New Acc) -> Risk Score: {res2.risk_score}, Severity: {res2.severity.value}, Rules: {res2.triggered_rules}")

        # ------------------------------------------------------------------
        # SCENARIO 3: Rapid Transfers (Rule 3: 3+ transfers in 5 minutes)
        # ------------------------------------------------------------------
        acc_rapid_sender = accounts[2]
        base_time = datetime.now(timezone.utc) - timedelta(minutes=10)

        for idx in range(4):
            rapid_txn = Transaction(
                id=uuid4(),
                transaction_id=f"TXN_RAPID_{idx+1}_{random.randint(100, 999)}",
                sender_account_id=acc_rapid_sender.id,
                receiver_account_id=accounts[(idx + 3) % len(accounts)].id,
                amount=Decimal("15000.00"),
                remark=f"Rapid split transfer #{idx+1}",
                status=TransactionStatus.COMPLETED.value,
                ip_address="10.0.0.88",
                timestamp=base_time + timedelta(seconds=idx * 40),
            )
            session.add(rapid_txn)
            await session.flush()
            res3, alert3 = await fraud_service.analyze_and_alert_transaction(rapid_txn, sender_account=acc_rapid_sender)
            if idx == 3:
                print(f"Scenario 3 (Rapid Transfer #4) -> Risk Score: {res3.risk_score}, Severity: {res3.severity.value}, Rules: {res3.triggered_rules}")

        # ------------------------------------------------------------------
        # SCENARIO 4: Balance Drain (Rule 5: > 80% balance transferred)
        # ------------------------------------------------------------------
        drain_user = User(
            id=uuid4(),
            full_name="Target Account User",
            email=f"drain_target_{random.randint(100, 999)}@moneytrace.dev",
            password_hash=hash_password("Customer123"),
            role=UserRole.CUSTOMER.value,
            is_active=True,
        )
        session.add(drain_user)
        await session.flush()

        drain_acc_num = await generate_unique_account_number(session)
        drain_account = Account(
            id=uuid4(),
            account_number=drain_acc_num,
            user_id=drain_user.id,
            balance=Decimal("10000.00"),
            status=AccountStatus.ACTIVE.value,
            created_at=datetime.now(timezone.utc) - timedelta(days=30),
        )
        session.add(drain_account)
        await session.flush()

        # Balance before is ₹100,000, transferring ₹90,000 (90% drain)
        txn4 = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_DRAIN_{random.randint(1000, 9999)}",
            sender_account_id=drain_account.id,
            receiver_account_id=accounts[1].id,
            amount=Decimal("90000.00"),
            remark="Account clearance transfer",
            status=TransactionStatus.COMPLETED.value,
            ip_address="203.0.113.19",
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=15),
        )
        session.add(txn4)
        await session.flush()
        res4, alert4 = await fraud_service.analyze_and_alert_transaction(
            txn4, sender_account=drain_account, sender_balance_before=Decimal("100000.00")
        )
        print(f"Scenario 4 (Balance Drain 90%) -> Risk Score: {res4.risk_score}, Severity: {res4.severity.value}, Rules: {res4.triggered_rules}")

        # ------------------------------------------------------------------
        # SCENARIO 5: Multi-Rule Layered Fraud (Rule 2 + Rule 3 + Rule 5)
        # ------------------------------------------------------------------
        critical_user = User(
            id=uuid4(),
            full_name="High Risk Mule User",
            email=f"mule_{random.randint(100, 999)}@moneytrace.dev",
            password_hash=hash_password("Customer123"),
            role=UserRole.CUSTOMER.value,
            is_active=True,
        )
        session.add(critical_user)
        await session.flush()

        mule_acc_num = await generate_unique_account_number(session)
        mule_account = Account(
            id=uuid4(),
            account_number=mule_acc_num,
            user_id=critical_user.id,
            balance=Decimal("5000.00"),
            status=AccountStatus.ACTIVE.value,
            created_at=datetime.now(timezone.utc) - timedelta(days=1),  # 1 day old
        )
        session.add(mule_account)
        await session.flush()

        txn5 = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_CRITICAL_{random.randint(1000, 9999)}",
            sender_account_id=mule_account.id,
            receiver_account_id=accounts[0].id,
            amount=Decimal("150000.00"),
            remark="Urgent overseas remittance",
            status=TransactionStatus.COMPLETED.value,
            ip_address="198.51.100.42",
            timestamp=datetime.now(timezone.utc) - timedelta(seconds=30),
        )
        session.add(txn5)
        await session.flush()
        res5, alert5 = await fraud_service.analyze_and_alert_transaction(
            txn5, sender_account=mule_account, sender_balance_before=Decimal("155000.00")
        )
        print(f"Scenario 5 (Critical Multi-Rule Fraud) -> Risk Score: {res5.risk_score}, Severity: {res5.severity.value}, Rules: {res5.triggered_rules}")

        # ------------------------------------------------------------------
        # SCENARIO 6: Impossible Travel (Rule 6: Location change in 5 mins)
        # ------------------------------------------------------------------
        travel_user = User(
            id=uuid4(),
            full_name="Traveler Customer",
            email=f"traveler_{random.randint(100, 999)}@moneytrace.dev",
            password_hash=hash_password("Customer123"),
            role=UserRole.CUSTOMER.value,
            is_active=True,
        )
        session.add(travel_user)
        await session.flush()

        travel_acc_num = await generate_unique_account_number(session)
        travel_account = Account(
            id=uuid4(),
            account_number=travel_acc_num,
            user_id=travel_user.id,
            balance=Decimal("200000.00"),
            status=AccountStatus.ACTIVE.value,
        )
        session.add(travel_account)
        await session.flush()

        # Txn A in Mumbai
        txn6_a = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_TRAVEL_MUM_{random.randint(100, 999)}",
            sender_account_id=travel_account.id,
            receiver_account_id=accounts[0].id,
            amount=Decimal("10000.00"),
            location="Mumbai, IN",
            status=TransactionStatus.COMPLETED.value,
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=10),
        )
        session.add(txn6_a)
        await session.flush()

        # Txn B in Delhi 5 mins later
        txn6_b = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_TRAVEL_DEL_{random.randint(100, 999)}",
            sender_account_id=travel_account.id,
            receiver_account_id=accounts[1].id,
            amount=Decimal("15000.00"),
            location="Delhi, IN",
            status=TransactionStatus.COMPLETED.value,
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=5),
        )
        session.add(txn6_b)
        await session.flush()
        res6, alert6 = await fraud_service.analyze_and_alert_transaction(txn6_b, sender_account=travel_account)
        print(f"Scenario 6 (Impossible Travel Mumbai -> Delhi) -> Risk Score: {res6.risk_score}, Severity: {res6.severity.value}, Rules: {res6.triggered_rules}")

        # ------------------------------------------------------------------
        # SCENARIO 7: Device Change (Rule 7: Samsung S23 -> iPhone 17 in 1h)
        # ------------------------------------------------------------------
        dev_user = User(
            id=uuid4(),
            full_name="Device Switcher Customer",
            email=f"dev_switch_{random.randint(100, 999)}@moneytrace.dev",
            password_hash=hash_password("Customer123"),
            role=UserRole.CUSTOMER.value,
            is_active=True,
        )
        session.add(dev_user)
        await session.flush()

        dev_acc_num = await generate_unique_account_number(session)
        dev_account = Account(
            id=uuid4(),
            account_number=dev_acc_num,
            user_id=dev_user.id,
            balance=Decimal("150000.00"),
            status=AccountStatus.ACTIVE.value,
        )
        session.add(dev_account)
        await session.flush()

        txn7_a = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_DEV_SAMS_{random.randint(100, 999)}",
            sender_account_id=dev_account.id,
            receiver_account_id=accounts[0].id,
            amount=Decimal("5000.00"),
            device_info="Samsung Galaxy S23",
            status=TransactionStatus.COMPLETED.value,
            timestamp=datetime.now(timezone.utc) - timedelta(hours=2),
        )
        session.add(txn7_a)
        await session.flush()

        txn7_b = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_DEV_IPHONE_{random.randint(100, 999)}",
            sender_account_id=dev_account.id,
            receiver_account_id=accounts[2].id,
            amount=Decimal("55000.00"),  # Large transfer (> 50k) + Device Change
            device_info="iPhone 17 Pro Max",
            status=TransactionStatus.COMPLETED.value,
            timestamp=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        session.add(txn7_b)
        await session.flush()
        res7, alert7 = await fraud_service.analyze_and_alert_transaction(txn7_b, sender_account=dev_account)
        print(f"Scenario 7 (Device Change Samsung S23 -> iPhone 17) -> Risk Score: {res7.risk_score}, Severity: {res7.severity.value}, Rules: {res7.triggered_rules}")

        # ------------------------------------------------------------------
        # SCENARIO 8: Mule Account Activity (Rule 8: Inbound deposit forwarded)
        # ------------------------------------------------------------------
        mule_acc_user = User(
            id=uuid4(),
            full_name="Layering Mule Account",
            email=f"layer_mule_{random.randint(100, 999)}@moneytrace.dev",
            password_hash=hash_password("Customer123"),
            role=UserRole.CUSTOMER.value,
            is_active=True,
        )
        session.add(mule_acc_user)
        await session.flush()

        mule_layer_acc_num = await generate_unique_account_number(session)
        mule_layer_acc = Account(
            id=uuid4(),
            account_number=mule_layer_acc_num,
            user_id=mule_acc_user.id,
            balance=Decimal("200000.00"),
            status=AccountStatus.ACTIVE.value,
        )
        session.add(mule_layer_acc)
        await session.flush()

        # Step 1: Receives INR 100,000 at t-30m
        txn8_inbound = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_MULE_IN_{random.randint(100, 999)}",
            sender_account_id=accounts[0].id,
            receiver_account_id=mule_layer_acc.id,
            amount=Decimal("100000.00"),
            remark="Inbound victim payment",
            status=TransactionStatus.COMPLETED.value,
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=30),
        )
        session.add(txn8_inbound)
        await session.flush()

        # Step 2: Immediately forwards INR 95,000 (95% of deposit) at t-10m
        txn8_outbound = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_MULE_OUT_{random.randint(100, 999)}",
            sender_account_id=mule_layer_acc.id,
            receiver_account_id=accounts[1].id,
            amount=Decimal("95000.00"),
            remark="Forwarding funds to Layer 2",
            status=TransactionStatus.COMPLETED.value,
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=10),
        )
        session.add(txn8_outbound)
        await session.flush()
        res8, alert8 = await fraud_service.analyze_and_alert_transaction(txn8_outbound, sender_account=mule_layer_acc)
        print(f"Scenario 8 (Mule Account Rapid Forward 95%) -> Risk Score: {res8.risk_score}, Severity: {res8.severity.value}, Rules: {res8.triggered_rules}")

        await session.commit()

        # Print summary
        stats = await fraud_service.get_fraud_stats()
        print("\n[OK] All 8 Suspicious transactions and fraud alerts successfully seeded!")
        print(f"  - Total Alerts: {stats['total_alerts']}")
        print(f"  - High Risk Alerts: {stats['high_risk']}")
        print(f"  - Critical Alerts: {stats['critical']}")
        print(f"  - Open Alerts: {stats['open_alerts']}")


if __name__ == "__main__":
    asyncio.run(seed_suspicious_data())
