"""Unit tests for Phase 8 Dashboard Analytics Service."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.account import Account
from app.models.fraud_alert import FraudAlert, Severity, AlertStatus
from app.models.recovery import RecoveryCase, RecoveryProbability, CaseStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User, UserRole
from app.services.dashboard_service import DashboardService

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def async_session():
    """Fixture providing an in-memory async database session."""
    engine = create_async_engine(TEST_DB_URL, echo=False)
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

    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_dashboard_overview_and_analytics(async_session: AsyncSession):
    """Test dashboard aggregation methods on seeded dataset."""
    inv = User(id=uuid4(), full_name="Agent Smith", email="smith@test.dev", password_hash="pass", role=UserRole.INVESTIGATOR.value)
    user = User(id=uuid4(), full_name="John Doe", email="john@test.dev", password_hash="pass")
    acc1 = Account(id=uuid4(), account_number="ACC_D1", user_id=user.id, balance=Decimal("100000.00"))
    acc2 = Account(id=uuid4(), account_number="ACC_D2", user_id=user.id, balance=Decimal("100000.00"))
    async_session.add_all([inv, user, acc1, acc2])
    await async_session.flush()

    now = datetime.now(timezone.utc)

    # 1. Normal Transaction
    t1 = Transaction(
        id=uuid4(),
        transaction_id="TXN_NORM_1",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("5000.00"),
        status=TransactionStatus.COMPLETED.value,
        location="Mumbai, IN",
        risk_score=10.0,
        is_flagged=False,
        timestamp=now,
    )
    # 2. Fraudulent Transaction
    t2 = Transaction(
        id=uuid4(),
        transaction_id="TXN_FRAUD_1",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("95000.00"),
        status=TransactionStatus.COMPLETED.value,
        location="Delhi, IN",
        risk_score=85.0,
        is_flagged=True,
        timestamp=now,
    )
    async_session.add_all([t1, t2])
    await async_session.flush()

    # Alert
    alt = FraudAlert(
        id=uuid4(),
        alert_id="ALT_TEST_1",
        transaction_id=t2.id,
        account_id=acc1.id,
        alert_type="Large Transaction",
        risk_score=85.0,
        severity=Severity.CRITICAL.value,
        description="High risk",
        rule_breakdown={"rules_triggered": ["Large Transaction"], "score_breakdown": {"Large Transaction": 85.0}},
        status=AlertStatus.OPEN.value,
        created_at=now,
    )
    async_session.add(alt)
    await async_session.flush()

    # Recovery Case
    rec = RecoveryCase(
        id=uuid4(),
        case_id="REC_TEST_1",
        alert_id=alt.id,
        transaction_id=t2.id,
        recovery_score=85.0,
        recovery_probability=RecoveryProbability.HIGH.value,
        current_holder_account="ACC_D2",
        amount_at_risk=95000.0,
        recommended_action="Freeze destination account immediately",
        status=CaseStatus.RECOVERED.value,
        assigned_to_id=inv.id,
        assigned_at=now - timedelta(hours=3),
        closed_at=now,
        created_at=now,
    )
    async_session.add(rec)
    await async_session.commit()

    service = DashboardService(async_session)

    # 1. Overview
    overview = await service.get_overview_stats()
    assert overview.total_transactions == 2
    assert overview.total_amount_processed == 100000.0
    assert overview.fraud_alerts == 1
    assert overview.critical_alerts == 1
    assert overview.recovered_cases == 1
    assert overview.money_recovered == 95000.0

    # 2. Live Stats
    live = await service.get_live_stats()
    assert live.active_alerts >= 1

    # 3. Transaction Analytics
    txn_analytics = await service.get_transaction_analytics()
    assert txn_analytics.daily_transactions == 2
    assert txn_analytics.highest_transaction == 95000.0
    assert txn_analytics.lowest_transaction == 5000.0

    # 4. Fraud Analytics
    fraud_analytics = await service.get_fraud_analytics()
    assert fraud_analytics.severity_breakdown["CRITICAL"] == 1
    assert fraud_analytics.rule_breakdown["Large Transaction"] >= 1

    # 5. Recovery Analytics
    rec_analytics = await service.get_recovery_analytics()
    assert rec_analytics.high_probability_cases == 1
    assert rec_analytics.recovery_success_rate == 100.0

    # 6. Risky Accounts
    risky = await service.get_top_risky_accounts(limit=5)
    assert len(risky.accounts) >= 1
    assert risky.accounts[0].composite_score > 0

    # 7. Investigator Stats
    inv_stats = await service.get_investigator_stats()
    assert len(inv_stats.leaderboard) >= 1
    assert inv_stats.leaderboard[0].cases_closed == 1
    assert inv_stats.leaderboard[0].recovery_success_rate == 100.0

    # 8. Export
    csv_data, mime = await service.export_dashboard_data(export_format="csv")
    assert mime == "text/csv"
    assert "MONEYTRACE DASHBOARD ANALYTICS EXPORT" in csv_data
