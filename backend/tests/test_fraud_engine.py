"""Unit tests for Phase 5 – Fraud Detection Engine and Fraud Services."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.account import Account, AccountStatus
from app.models.fraud_alert import FraudAlert, Severity, AlertStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User, UserRole
from app.services.fraud_rules import FraudRulesEngine, Severity
from app.services.fraud_service import FraudService


# Setup SQLite in-memory database for testing
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def async_session():
    """Fixture providing an async database session with initialized tables."""
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_rule_1_large_transaction(async_session: AsyncSession):
    """Test Rule 1: Large Transaction (> ₹50,000) adds +30 risk score."""
    user = User(id=uuid4(), full_name="User 1", email="u1@test.dev", password_hash="pass")
    acc1 = Account(id=uuid4(), account_number="ACC10001", user_id=user.id, balance=Decimal("200000.00"))
    acc2 = Account(id=uuid4(), account_number="ACC10002", user_id=user.id, balance=Decimal("100000.00"))
    async_session.add_all([user, acc1, acc2])
    await async_session.flush()

    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN_R1_TEST",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("60000.00"),  # > 50k, <= 100k
        status=TransactionStatus.COMPLETED.value,
        timestamp=datetime.now(timezone.utc),
    )
    async_session.add(txn)
    await async_session.flush()

    res = await FraudRulesEngine.evaluate_transaction(
        async_session, txn, sender_account=acc1, sender_balance_before=Decimal("260000.00")
    )

    assert res.risk_score == 30.0
    assert res.severity == Severity.MEDIUM
    assert "Large Transaction" in res.triggered_rules
    assert res.is_flagged is True


@pytest.mark.asyncio
async def test_rule_2_very_large_transaction(async_session: AsyncSession):
    """Test Rule 2: Very Large Transaction (> ₹100,000) adds +50 risk score."""
    user = User(id=uuid4(), full_name="User 2", email="u2@test.dev", password_hash="pass")
    acc1 = Account(id=uuid4(), account_number="ACC20001", user_id=user.id, balance=Decimal("500000.00"))
    acc2 = Account(id=uuid4(), account_number="ACC20002", user_id=user.id, balance=Decimal("100000.00"))
    async_session.add_all([user, acc1, acc2])
    await async_session.flush()

    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN_R2_TEST",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("120000.00"),  # > 100k
        status=TransactionStatus.COMPLETED.value,
        timestamp=datetime.now(timezone.utc) - timedelta(days=10),
    )
    async_session.add(txn)
    await async_session.flush()

    res = await FraudRulesEngine.evaluate_transaction(
        async_session, txn, sender_account=acc1, sender_balance_before=Decimal("620000.00")
    )

    assert res.risk_score == 50.0
    assert res.severity == Severity.MEDIUM
    assert "Very Large Transaction" in res.triggered_rules


@pytest.mark.asyncio
async def test_rule_3_rapid_transfers(async_session: AsyncSession):
    """Test Rule 3: 3+ transactions in 5 minutes adds +25 risk score."""
    user = User(id=uuid4(), full_name="User 3", email="u3@test.dev", password_hash="pass")
    acc1 = Account(id=uuid4(), account_number="ACC30001", user_id=user.id, balance=Decimal("500000.00"))
    acc2 = Account(id=uuid4(), account_number="ACC30002", user_id=user.id, balance=Decimal("100000.00"))
    async_session.add_all([user, acc1, acc2])
    await async_session.flush()

    now = datetime.now(timezone.utc)
    # Add 2 prior transactions within last 3 minutes
    for i in range(2):
        prior_txn = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_R3_PRIOR_{i}",
            sender_account_id=acc1.id,
            receiver_account_id=acc2.id,
            amount=Decimal("5000.00"),
            status=TransactionStatus.COMPLETED.value,
            timestamp=now - timedelta(minutes=i + 1),
        )
        async_session.add(prior_txn)
    await async_session.flush()

    # 3rd transaction now
    txn3 = Transaction(
        id=uuid4(),
        transaction_id="TXN_R3_TEST",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("5000.00"),
        status=TransactionStatus.COMPLETED.value,
        timestamp=now,
    )
    async_session.add(txn3)
    await async_session.flush()

    res = await FraudRulesEngine.evaluate_transaction(
        async_session, txn3, sender_account=acc1, sender_balance_before=Decimal("500000.00")
    )

    assert "Rapid Transfers" in res.triggered_rules
    assert res.risk_score >= 25.0


@pytest.mark.asyncio
async def test_rule_4_new_account_activity(async_session: AsyncSession):
    """Test Rule 4: New Account (< 7 days) with transfer > 20,000 adds +20 risk score."""
    user = User(id=uuid4(), full_name="User 4", email="u4@test.dev", password_hash="pass")
    # Created 2 days ago
    acc1 = Account(
        id=uuid4(),
        account_number="ACC40001",
        user_id=user.id,
        balance=Decimal("100000.00"),
        created_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    acc2 = Account(id=uuid4(), account_number="ACC40002", user_id=user.id, balance=Decimal("100000.00"))
    async_session.add_all([user, acc1, acc2])
    await async_session.flush()

    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN_R4_TEST",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("25000.00"),  # > 20,000
        status=TransactionStatus.COMPLETED.value,
        timestamp=datetime.now(timezone.utc),
    )
    async_session.add(txn)
    await async_session.flush()

    res = await FraudRulesEngine.evaluate_transaction(
        async_session, txn, sender_account=acc1, sender_balance_before=Decimal("125000.00")
    )

    assert "New Account Activity" in res.triggered_rules
    assert res.risk_score == 20.0  # Only Rule 4 triggered


@pytest.mark.asyncio
async def test_rule_5_balance_drain(async_session: AsyncSession):
    """Test Rule 5: More than 80% balance transferred adds +40 risk score."""
    user = User(id=uuid4(), full_name="User 5", email="u5@test.dev", password_hash="pass")
    acc1 = Account(id=uuid4(), account_number="ACC50001", user_id=user.id, balance=Decimal("10000.00"))
    acc2 = Account(id=uuid4(), account_number="ACC50002", user_id=user.id, balance=Decimal("100000.00"))
    async_session.add_all([user, acc1, acc2])
    await async_session.flush()

    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN_R5_TEST",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("45000.00"),  # 45k out of 50k balance before = 90% drain
        status=TransactionStatus.COMPLETED.value,
        timestamp=datetime.now(timezone.utc) - timedelta(days=10),
    )
    async_session.add(txn)
    await async_session.flush()

    res = await FraudRulesEngine.evaluate_transaction(
        async_session, txn, sender_account=acc1, sender_balance_before=Decimal("50000.00")
    )

    assert "Balance Drain" in res.triggered_rules
    assert res.risk_score == 40.0
    assert res.severity == Severity.MEDIUM


@pytest.mark.asyncio
async def test_fraud_service_auto_alert_creation(async_session: AsyncSession):
    """Test that FraudService automatically creates FraudAlert when risk_score >= 30."""
    user = User(id=uuid4(), full_name="User Alert", email="ualert@test.dev", password_hash="pass")
    acc1 = Account(
        id=uuid4(),
        account_number="ACC60001",
        user_id=user.id,
        balance=Decimal("100000.00"),
        created_at=datetime.now(timezone.utc) - timedelta(days=1),  # New account < 7 days
    )
    acc2 = Account(id=uuid4(), account_number="ACC60002", user_id=user.id, balance=Decimal("100000.00"))
    async_session.add_all([user, acc1, acc2])
    await async_session.flush()

    # Transaction triggers Rule 2 (Very Large > 100k -> +50) + Rule 4 (New Account > 20k -> +20) = 70 (HIGH)
    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN_ALERT_TEST",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("120000.00"),
        status=TransactionStatus.COMPLETED.value,
        timestamp=datetime.now(timezone.utc),
    )
    async_session.add(txn)
    await async_session.flush()

    service = FraudService(async_session)
    res, alert = await service.analyze_and_alert_transaction(txn, sender_account=acc1)
    await async_session.commit()

    assert txn.risk_score == 70.0
    assert txn.is_flagged is True
    assert alert is not None
    assert alert.risk_score == 70.0
    assert alert.severity == Severity.HIGH.value
    assert alert.status == AlertStatus.OPEN.value

    # Verify query stats
    stats = await service.get_fraud_stats()
    assert stats["total_alerts"] == 1
    assert stats["high_risk"] == 1
    assert stats["open_alerts"] == 1
