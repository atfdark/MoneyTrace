"""Unit tests for Phase 10 Reports & Export Engine."""

from datetime import datetime, timezone
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
from app.models.user import User
from app.services.report_generator import ReportGenerator

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def async_session():
    """Fixture providing in-memory database session."""
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
async def test_report_generation_suite(async_session: AsyncSession):
    """Test full report compilation and document generator pipeline."""
    user = User(id=uuid4(), full_name="Report User", email="report@test.dev", password_hash="pass")
    acc1 = Account(id=uuid4(), account_number="ACC_R1", user_id=user.id, balance=Decimal("100000.00"))
    acc2 = Account(id=uuid4(), account_number="ACC_R2", user_id=user.id, balance=Decimal("50000.00"))
    async_session.add_all([user, acc1, acc2])
    await async_session.flush()

    now = datetime.now(timezone.utc)
    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN_REP_TEST",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("75000.00"),
        status=TransactionStatus.COMPLETED.value,
        location="Mumbai, IN",
        risk_score=88.0,
        is_flagged=True,
        timestamp=now,
    )
    async_session.add(txn)
    await async_session.flush()

    alert = FraudAlert(
        id=uuid4(),
        alert_id="ALT_REP_TEST",
        transaction_id=txn.id,
        account_id=acc1.id,
        alert_type="Large Transaction",
        risk_score=88.0,
        severity=Severity.CRITICAL.value,
        description="High risk alert",
        rule_breakdown={"rules_triggered": ["Large Transaction"], "score_breakdown": {"Large Transaction": 88.0}},
        status=AlertStatus.OPEN.value,
        created_at=now,
    )
    async_session.add(alert)
    await async_session.flush()

    case = RecoveryCase(
        id=uuid4(),
        case_id="REC_REP_TEST",
        alert_id=alert.id,
        transaction_id=txn.id,
        recovery_score=82.0,
        recovery_probability=RecoveryProbability.HIGH.value,
        current_holder_account="ACC_R2",
        amount_at_risk=75000.0,
        recommended_action="Freeze destination account immediately",
        status=CaseStatus.OPEN.value,
        created_at=now,
    )
    async_session.add(case)
    await async_session.commit()

    generator = ReportGenerator(async_session)

    # 1. Charts
    chart1 = await generator.generate_fraud_severity_chart()
    assert chart1.exists()
    chart2 = await generator.generate_recovery_probability_chart()
    assert chart2.exists()

    # 2. PDF Generation
    pdf_path, pdf_name = await generator.generate_investigation_pdf("REC_REP_TEST")
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 500

    # 3. DOCX Generation
    docx_path, docx_name = await generator.generate_investigation_docx("REC_REP_TEST")
    assert docx_path.exists()
    assert docx_path.stat().st_size > 500

    # 4. CSV Export
    csv_path, csv_name = await generator.export_transactions_csv()
    assert csv_path.exists()
    assert csv_path.stat().st_size > 10

    # 5. XLSX Export
    xlsx_path, xlsx_name = await generator.export_dashboard_xlsx()
    assert xlsx_path.exists()
    assert xlsx_path.stat().st_size > 1000
