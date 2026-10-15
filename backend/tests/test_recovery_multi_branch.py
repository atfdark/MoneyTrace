"""Test suite for Institutional Multi-Branch Asset Recovery & Statutory Lien Command Center."""

import pytest
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.account import Account, AccountStatus
from app.models.fraud_alert import FraudAlert, AlertStatus, Severity
from app.models.recovery import RecoveryCase, RecoveryProbability, CaseStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User, UserRole
from app.services.recovery_engine import RecoveryEngine
from app.services.recovery_service import RecoveryService

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
            "ALTER TABLE recovery_cases ADD COLUMN recovered_amount FLOAT DEFAULT 0.0",
            "ALTER TABLE recovery_cases ADD COLUMN lien_amount FLOAT DEFAULT 0.0",
            "ALTER TABLE recovery_cases ADD COLUMN recovery_branches JSON",
            "ALTER TABLE recovery_cases ADD COLUMN score_breakdown JSON",
            "ALTER TABLE accounts ADD COLUMN lien_amount DECIMAL(18,2) DEFAULT 0.0",
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
async def test_recovery_engine_branch_synthesis_and_decay(async_session: AsyncSession):
    """Test RecoveryEngine multi-branch synthesis, time decay, and factor generation."""
    branches = RecoveryEngine.synthesize_branches(150000.0, "ACC5008", "OPEN")
    assert len(branches) == 3
    assert branches[0]["branch_id"] == "BR-01"
    assert branches[0]["rail"] == "NEFT"
    assert branches[0]["tainted_amount"] == 75000.0
    assert branches[0]["recoverable_amount"] == 75000.0

    assert branches[1]["branch_id"] == "BR-02"
    assert branches[1]["rail"] == "IMPS"
    assert branches[1]["tainted_amount"] == 45000.0

    assert branches[2]["branch_id"] == "BR-03"
    assert branches[2]["rail"] == "ATM_EXIT"
    assert branches[2]["recoverable_amount"] == 0.0
    assert branches[2]["status"] == "LEAKED_ATM"

    # User & Accounts
    user = User(id=uuid4(), full_name="Victim Alice", email="alice@test.dev", password_hash="pass", role=UserRole.CUSTOMER.value)
    acc1 = Account(id=uuid4(), user_id=user.id, account_number="ACC1001", balance=Decimal("200000.0"), status=AccountStatus.ACTIVE.value)
    acc2 = Account(id=uuid4(), user_id=user.id, account_number="ACC5008", balance=Decimal("120000.0"), status=AccountStatus.ACTIVE.value)
    async_session.add_all([user, acc1, acc2])
    await async_session.commit()

    # Transaction
    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN-REC-001",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("150000.0"),
        risk_score=85.0,
        status=TransactionStatus.COMPLETED.value,
        created_at=datetime.now(timezone.utc),
    )
    async_session.add(txn)
    await async_session.commit()

    alert = FraudAlert(
        id=uuid4(),
        alert_id="ALT-REC-001",
        account_id=acc1.id,
        transaction_id=txn.id,
        alert_type="RAPID_MOVEMENT",
        description="Sudden outbound siphon alert",
        severity=Severity.CRITICAL.value,
        status=AlertStatus.OPEN.value,
        risk_score=88.0,
        created_at=datetime.now(timezone.utc),
    )
    async_session.add(alert)
    await async_session.commit()

    # Evaluate recovery
    result = await RecoveryEngine.evaluate_recovery(async_session, alert, txn)
    assert result.recovery_score >= 50.0
    assert len(result.recovery_branches) == 3
    assert "factors" in result.score_breakdown
    assert len(result.score_breakdown["factors"]) >= 3
    assert "golden_hour" in result.score_breakdown
    assert result.score_breakdown["golden_hour"]["is_active"] is True


@pytest.mark.asyncio
async def test_recovery_service_ensures_branches_on_legacy_cases(async_session: AsyncSession):
    """Test that existing cases with NULL branches dynamically receive synthesized branches."""
    user = User(id=uuid4(), full_name="Investigator Bob", email="bob@test.dev", password_hash="pass", role=UserRole.INVESTIGATOR.value)
    acc = Account(id=uuid4(), user_id=user.id, account_number="ACC3002", balance=Decimal("80000.0"), status=AccountStatus.ACTIVE.value)
    async_session.add_all([user, acc])
    await async_session.commit()

    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN-LEGACY",
        sender_account_id=acc.id,
        receiver_account_id=acc.id,
        amount=Decimal("90000.0"),
        created_at=datetime.now(timezone.utc),
    )
    async_session.add(txn)
    await async_session.commit()

    alert = FraudAlert(
        id=uuid4(),
        alert_id="ALT-LEGACY",
        account_id=acc.id,
        transaction_id=txn.id,
        alert_type="RAPID_MOVEMENT",
        description="Legacy transaction movement alert",
        severity=Severity.MEDIUM.value,
        status=AlertStatus.OPEN.value,
        risk_score=75.0,
        created_at=datetime.now(timezone.utc),
    )
    async_session.add(alert)
    await async_session.commit()

    # Create a legacy case with NULL branches and NULL score_breakdown
    case = RecoveryCase(
        id=uuid4(),
        case_id="REC-LEGACY-01",
        alert_id=alert.id,
        transaction_id=txn.id,
        recovery_score=78.0,
        recovery_probability=RecoveryProbability.MEDIUM.value,
        current_holder_account="ACC3002",
        amount_at_risk=90000.0,
        recovered_amount=0.0,
        lien_amount=0.0,
        recovery_branches=None,
        score_breakdown=None,
        recommended_action="Legacy Action",
        status=CaseStatus.OPEN.value,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    async_session.add(case)
    await async_session.commit()

    service = RecoveryService(async_session)
    retrieved = await service.get_case("REC-LEGACY-01")

    assert retrieved.recovery_branches is not None
    assert len(retrieved.recovery_branches) == 3
    assert retrieved.score_breakdown is not None
    assert "factors" in retrieved.score_breakdown
    assert retrieved.score_breakdown["metrics"]["amount_at_risk"] == 90000.0


@pytest.mark.asyncio
async def test_freeze_and_protect_statutory_lien(async_session: AsyncSession):
    """Test targeted statutory lien (Sec 106 BNSS) vs full freeze."""
    from app.routes.api_v1.endpoints.recovery import freeze_and_protect, FreezeAndProtectRequest

    user = User(id=uuid4(), full_name="Admin Officer", email="admin@test.dev", password_hash="pass", role=UserRole.ADMIN.value)
    acc = Account(id=uuid4(), user_id=user.id, account_number="ACC7001", balance=Decimal("150000.0"), status=AccountStatus.ACTIVE.value)
    async_session.add_all([user, acc])
    await async_session.commit()

    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN-LIEN-01",
        sender_account_id=acc.id,
        receiver_account_id=acc.id,
        amount=Decimal("100000.0"),
        created_at=datetime.now(timezone.utc),
    )
    async_session.add(txn)
    await async_session.commit()

    alert = FraudAlert(
        id=uuid4(),
        alert_id="ALT-LIEN-01",
        account_id=acc.id,
        transaction_id=txn.id,
        alert_type="RAPID_MOVEMENT",
        description="Lien test alert",
        severity=Severity.HIGH.value,
        status=AlertStatus.OPEN.value,
        risk_score=80.0,
        created_at=datetime.now(timezone.utc),
    )
    async_session.add(alert)
    await async_session.commit()

    case = RecoveryCase(
        id=uuid4(),
        case_id="REC-LIEN-01",
        alert_id=alert.id,
        transaction_id=txn.id,
        recovery_score=85.0,
        recovery_probability=RecoveryProbability.HIGH.value,
        current_holder_account="ACC7001",
        amount_at_risk=100000.0,
        recovered_amount=0.0,
        lien_amount=0.0,
        recovery_branches=RecoveryEngine.synthesize_branches(100000.0, "ACC7001", "OPEN"),
        status=CaseStatus.OPEN.value,
        recommended_action="Open Action",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    async_session.add(case)
    await async_session.commit()

    # 1. Place Statutory Lien (mode="LIEN")
    req = FreezeAndProtectRequest(
        case_id="REC-LIEN-01",
        account_number="ACC7001",
        mode="LIEN",
        reason="Sec 106 BNSS statutory lien test",
    )
    res = await freeze_and_protect(req, current_user=user, session=async_session)

    assert res["success"] is True
    assert res["mode"] == "LIEN"
    assert res["status"] == "ACTION_TAKEN"
    assert res["lien_amount"] == 80000.0  # BR-01 (50k) + BR-02 (30k)
    assert len(res["recovery_branches"]) == 3
    assert res["recovery_branches"][0]["status"] == "LIEN_MARKED"
    assert res["recovery_branches"][1]["status"] == "LIEN_MARKED"
    assert res["recovery_branches"][2]["status"] == "LEAKED_ATM"
    assert len(res["npci_dispatch_steps"]) == 3


@pytest.mark.asyncio
async def test_pro_rata_restitution_and_legal_notice(async_session: AsyncSession):
    """Test pro-rata partial restitution and Section 106 BNSS multi-bank schedule."""
    from app.routes.api_v1.endpoints.recovery import restitute_case, generate_legal_notice

    user = User(id=uuid4(), full_name="Admin Officer", email="admin@test.dev", password_hash="pass", role=UserRole.ADMIN.value)
    vic_acc = Account(id=uuid4(), user_id=user.id, account_number="ACC1001", balance=Decimal("10000.0"), status=AccountStatus.ACTIVE.value)
    hold_acc = Account(id=uuid4(), user_id=user.id, account_number="ACC8001", balance=Decimal("150000.0"), status=AccountStatus.ACTIVE.value)
    async_session.add_all([user, vic_acc, hold_acc])
    await async_session.commit()

    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN-REST-01",
        sender_account_id=vic_acc.id,
        receiver_account_id=hold_acc.id,
        amount=Decimal("100000.0"),
        created_at=datetime.now(timezone.utc),
    )
    async_session.add(txn)
    await async_session.commit()

    alert = FraudAlert(
        id=uuid4(),
        alert_id="ALT-REST-01",
        account_id=vic_acc.id,
        transaction_id=txn.id,
        alert_type="RAPID_MOVEMENT",
        description="Restitution test alert",
        severity=Severity.HIGH.value,
        status=AlertStatus.OPEN.value,
        risk_score=80.0,
        created_at=datetime.now(timezone.utc),
    )
    async_session.add(alert)
    await async_session.commit()

    case = RecoveryCase(
        id=uuid4(),
        case_id="REC-REST-01",
        alert_id=alert.id,
        transaction_id=txn.id,
        recovery_score=88.0,
        recovery_probability=RecoveryProbability.HIGH.value,
        current_holder_account="ACC8001",
        amount_at_risk=100000.0,
        recovered_amount=0.0,
        lien_amount=80000.0,
        recovery_branches=RecoveryEngine.synthesize_branches(100000.0, "ACC8001", "ACTION_TAKEN"),
        status=CaseStatus.ACTION_TAKEN.value,
        recommended_action="Action taken",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    async_session.add(case)
    await async_session.commit()

    # 1. Execute Pro-Rata Restitution
    res = await restitute_case(case_id="REC-REST-01", current_user=user, session=async_session)

    assert res["success"] is True
    assert res["status"] == "RECOVERED"
    assert res["amount_restituted"] == 80000.0  # 80% pro-rata recovered
    assert res["leaked_shortfall"] == 20000.0   # 20% ATM shortfall
    assert res["recovery_percentage"] == 80.0
    assert res["victim_balance"] == 90000.0     # 10000 + 80000

    # 2. Generate Legal Notice with Multi-Bank Schedule
    notice_res = await generate_legal_notice(case_id="REC-REST-01", current_user=user, session=async_session)
    assert notice_res["success"] is True
    assert "SCHEDULE OF BENEFICIARY / MULE ACCOUNTS" in notice_res["notice_text"]
    assert "BR-01" in notice_res["notice_text"]
    assert "BR-02" in notice_res["notice_text"]
    assert "BR-03" in notice_res["notice_text"]
    assert "106 BNSS" in notice_res["statute"]

