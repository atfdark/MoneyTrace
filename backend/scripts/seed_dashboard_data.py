#!/usr/bin/env python
"""Large-scale realistic historical seeder for Phase 8 – Dashboard Analytics."""

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
from app.models.fraud_alert import FraudAlert, Severity, AlertStatus
from app.models.recovery import RecoveryCase, RecoveryProbability, CaseStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User, UserRole
from scripts.seed_recovery_cases import seed_recovery_cases

LOCATIONS = [
    "Mumbai, IN",
    "Delhi, IN",
    "Bangalore, IN",
    "Pune, IN",
    "Hyderabad, IN",
    "Chennai, IN",
    "Kolkata, IN",
    "Ahmedabad, IN",
    "Jaipur, IN",
]

DEVICES = [
    "iPhone 16 Pro Max",
    "Samsung Galaxy S24 Ultra",
    "Pixel 9 Pro",
    "MacBook Pro (Chrome 128)",
    "Windows 11 (Edge 128)",
    "OnePlus 12",
    "iPad Pro (Safari)",
]

REMARKS = [
    "Online payment",
    "Invoice settlement",
    "Vendor payment",
    "Grocery purchase",
    "Utility bill",
    "Consulting fee",
    "Rent transfer",
    "P2P transfer",
    "Software subscription",
    "Urgent remittance",
]


async def seed_dashboard_data():
    """Seed 5000+ transactions, 100+ alerts, and 50+ recovery cases across 30+ days."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for col_stmt in [
            "ALTER TABLE fraud_alerts ADD COLUMN rule_breakdown JSON",
            "ALTER TABLE recovery_cases ADD COLUMN assigned_to_id UUID",
            "ALTER TABLE recovery_cases ADD COLUMN assigned_at TIMESTAMP",
            "ALTER TABLE recovery_cases ADD COLUMN closed_at TIMESTAMP",
        ]:
            try:
                await conn.execute(text(col_stmt))
            except Exception:
                pass

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("Starting Large-Scale Dashboard Historical Seeding...")

        # 1. Ensure at least 3 distinct investigators exist
        inv_data = [
            ("Sarah Connor", "sarah.connor@moneytrace.dev"),
            ("Alex Mercer", "alex.mercer@moneytrace.dev"),
            ("Elena Fisher", "elena.fisher@moneytrace.dev"),
        ]
        investigators: list[User] = []
        for name, email in inv_data:
            res = await session.execute(select(User).where(User.email == email))
            inv = res.scalar_one_or_none()
            if not inv:
                inv = User(
                    id=uuid4(),
                    full_name=name,
                    email=email,
                    password_hash=hash_password("Invest123"),
                    role=UserRole.INVESTIGATOR.value,
                    is_active=True,
                )
                session.add(inv)
                await session.flush()
            investigators.append(inv)

        # 2. Get existing accounts or ensure seed_recovery_cases ran
        acc_res = await session.execute(select(Account))
        accounts = list(acc_res.scalars().all())

        if len(accounts) < 10:
            print("Running prior seeders first...")
            await session.close()
            await seed_recovery_cases()
            async with async_session() as session2:
                acc_res = await session2.execute(select(Account))
                accounts = list(acc_res.scalars().all())
                session = session2

        print(f"Generating 5,000+ historical transactions across {len(accounts)} accounts...")

        now = datetime.now(timezone.utc)
        batch_txns: list[Transaction] = []
        batch_alerts: list[FraudAlert] = []
        batch_cases: list[RecoveryCase] = []

        total_txns_target = 5200
        alerts_target = 120
        cases_target = 60

        for i in range(total_txns_target):
            # Distribute timestamps across the last 35 days
            days_ago = random.uniform(0.01, 35.0)
            txn_ts = now - timedelta(days=days_ago)

            sender = random.choice(accounts)
            receiver = random.choice([a for a in accounts if a.id != sender.id])

            is_suspicious = (i % 40 == 0) or (i < 50)
            if is_suspicious:
                amount = Decimal(str(random.randint(55000, 250000)))
                risk_score = float(random.randint(65, 98))
                is_flagged = True
            else:
                amount = Decimal(str(random.randint(200, 45000) + round(random.random(), 2)))
                risk_score = float(random.randint(5, 28))
                is_flagged = False

            loc = random.choice(LOCATIONS)
            dev = random.choice(DEVICES)

            txn_id_str = f"TXN_{txn_ts.strftime('%Y%m%d')}_{i:05d}_{uuid4().hex[:6]}"
            txn = Transaction(
                id=uuid4(),
                transaction_id=txn_id_str,
                sender_account_id=sender.id,
                receiver_account_id=receiver.id,
                amount=amount,
                remark=random.choice(REMARKS),
                status=TransactionStatus.COMPLETED.value,
                device_info=dev,
                ip_address=f"192.168.{random.randint(1, 254)}.{random.randint(1, 254)}",
                location=loc,
                risk_score=risk_score,
                is_flagged=is_flagged,
                timestamp=txn_ts,
                created_at=txn_ts,
            )
            batch_txns.append(txn)

            # Generate FraudAlert for suspicious transactions
            if is_suspicious and len(batch_alerts) < alerts_target:
                sev = Severity.CRITICAL.value if risk_score >= 80.0 else (Severity.HIGH.value if risk_score >= 60.0 else Severity.MEDIUM.value)
                rules_pool = ["Large Transaction", "Very Large Transaction", "Rapid Transfers", "New Account Activity", "Impossible Travel", "Device Change", "Balance Drain", "Mule Account Activity"]
                chosen_rules = random.sample(rules_pool, k=random.randint(1, 3))
                score_dict = {r: round(risk_score / len(chosen_rules), 1) for r in chosen_rules}

                alert_id_str = f"ALT{txn_ts.strftime('%Y%m%d%H%M%S')}_{len(batch_alerts):03d}_{uuid4().hex[:4]}"
                alert = FraudAlert(
                    id=uuid4(),
                    alert_id=alert_id_str,
                    transaction_id=txn.id,
                    account_id=sender.id,
                    alert_type=", ".join(chosen_rules),
                    risk_score=risk_score,
                    severity=sev,
                    description="\n".join([f"- {r} (+{score_dict[r]} Risk)" for r in chosen_rules]),
                    rule_breakdown={"rules_triggered": chosen_rules, "score_breakdown": score_dict},
                    status=random.choice([AlertStatus.OPEN.value, AlertStatus.UNDER_REVIEW.value, AlertStatus.CLOSED.value]),
                    created_at=txn_ts,
                )
                batch_alerts.append(alert)

                # Generate RecoveryCase
                if len(batch_cases) < cases_target:
                    rec_score = float(random.randint(35, 95))
                    prob = RecoveryProbability.HIGH.value if rec_score >= 80 else (RecoveryProbability.MEDIUM.value if rec_score >= 50 else RecoveryProbability.LOW.value)
                    action = "Freeze destination account immediately" if rec_score >= 80 else ("Monitor account and request transaction hold" if rec_score >= 50 else "Escalate to law enforcement and continue tracing")

                    case_status = random.choice([CaseStatus.OPEN.value, CaseStatus.ACTION_TAKEN.value, CaseStatus.RECOVERED.value, CaseStatus.FAILED.value])
                    assigned_inv = random.choice(investigators)
                    assigned_time = txn_ts + timedelta(minutes=random.randint(10, 60))
                    closed_time = assigned_time + timedelta(hours=random.uniform(1.5, 12.0)) if case_status in [CaseStatus.RECOVERED.value, CaseStatus.FAILED.value] else None

                    case = RecoveryCase(
                        id=uuid4(),
                        case_id=f"REC{txn_ts.strftime('%Y%m%d')}_{len(batch_cases):03d}_{uuid4().hex[:4]}",
                        alert_id=alert.id,
                        transaction_id=txn.id,
                        recovery_score=rec_score,
                        recovery_probability=prob,
                        current_holder_account=receiver.account_number,
                        amount_at_risk=float(amount),
                        recommended_action=action,
                        status=case_status,
                        assigned_to_id=assigned_inv.id,
                        assigned_at=assigned_time,
                        closed_at=closed_time,
                        created_at=txn_ts,
                        updated_at=closed_time or txn_ts,
                    )
                    batch_cases.append(case)

        # Batch insert to avoid SQLite parameter overflow
        chunk_size = 500
        for idx in range(0, len(batch_txns), chunk_size):
            session.add_all(batch_txns[idx : idx + chunk_size])
            await session.flush()

        session.add_all(batch_alerts)
        await session.flush()

        session.add_all(batch_cases)
        await session.commit()

        print(f"[OK] Successfully seeded:")
        print(f"  - {len(batch_txns)} Transactions")
        print(f"  - {len(batch_alerts)} Fraud Alerts")
        print(f"  - {len(batch_cases)} Recovery Cases")
        print(f"  - Across 35 historical days with multiple investigator profiles.")


if __name__ == "__main__":
    asyncio.run(seed_dashboard_data())
