"""Unit tests for Phase 9 AI Investigator Assistant Pro."""

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
from app.services.ai_assistant import AIInvestigatorAssistant
from app.services.case_similarity import CaseSimilarityService
from app.services.fraud_classifier import FraudPatternClassifier
from app.services.rag_knowledge import RAGKnowledgeService

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


def test_rag_compliance_knowledge():
    """Test offline RAG search across RBI circulars and PMLA guidelines."""
    res_rbi = RAGKnowledgeService.search("customer liability 3 days unauthorized payment", top_k=2)
    assert len(res_rbi) >= 1
    assert "RAG-RBI-001" in [r["doc_id"] for r in res_rbi]

    res_pmla = RAGKnowledgeService.search("suspicious transaction reporting STR layering", top_k=2)
    assert len(res_pmla) >= 1
    assert "RAG-PMLA-002" in [r["doc_id"] for r in res_pmla]


def test_ml_fraud_pattern_classifier():
    """Test ML fraud pattern classification and confidence calculations."""
    mule_res = FraudPatternClassifier.classify(
        amount=95000.0,
        risk_score=85.0,
        triggered_rules=["Mule Account Activity", "Rapid Transfers"],
        is_mule=True,
    )
    assert mule_res.predicted_type == "Mule Account Activity"
    assert mule_res.confidence_score >= 75.0

    takeover_res = FraudPatternClassifier.classify(
        amount=75000.0,
        risk_score=90.0,
        triggered_rules=["Device Change", "Impossible Travel"],
    )
    assert takeover_res.predicted_type == "Account Takeover"


@pytest.mark.asyncio
async def test_ai_copilot_forensic_skills(async_session: AsyncSession):
    """Test forensic explanation skills of AIInvestigatorAssistant."""
    user = User(id=uuid4(), full_name="Investigator Alice", email="alice@test.dev", password_hash="pass")
    acc_src = Account(id=uuid4(), account_number="ACC_SRC_1", user_id=user.id, balance=Decimal("200000.00"))
    acc_dst = Account(id=uuid4(), account_number="ACC_DST_2", user_id=user.id, balance=Decimal("100000.00"))
    async_session.add_all([user, acc_src, acc_dst])
    await async_session.flush()

    now = datetime.now(timezone.utc)
    txn = Transaction(
        id=uuid4(),
        transaction_id="TXN_TEST_COPILOT",
        sender_account_id=acc_src.id,
        receiver_account_id=acc_dst.id,
        amount=Decimal("120000.00"),
        status=TransactionStatus.COMPLETED.value,
        location="Mumbai, IN",
        risk_score=92.0,
        is_flagged=True,
        timestamp=now,
    )
    async_session.add(txn)
    await async_session.flush()

    alert = FraudAlert(
        id=uuid4(),
        alert_id="ALT_TEST_COPILOT",
        transaction_id=txn.id,
        account_id=acc_src.id,
        alert_type="Large Transaction, Rapid Transfers",
        risk_score=92.0,
        severity=Severity.CRITICAL.value,
        description="Flagged",
        rule_breakdown={"rules_triggered": ["Large Transaction", "Rapid Transfers"], "score_breakdown": {"Large Transaction": 50.0, "Rapid Transfers": 42.0}},
        status=AlertStatus.OPEN.value,
        created_at=now,
    )
    async_session.add(alert)
    await async_session.commit()

    assistant = AIInvestigatorAssistant(async_session)

    # 1. Test Explain Transaction
    res_txn = await assistant.chat("Why was transaction TXN_TEST_COPILOT flagged?", user_id=user.id)
    assert "TXN_TEST_COPILOT" in res_txn.answer
    assert "Large Transaction" in res_txn.answer
    assert res_txn.intent == "EXPLAIN_TRANSACTION"
    assert len(res_txn.xai_weights) > 0

    # 2. Test Mule Account Explanation
    res_acc = await assistant.chat("Why is ACC_DST_2 suspicious?", user_id=user.id)
    assert "ACC_DST_2" in res_acc.answer
    assert res_acc.intent == "MULE_ACCOUNT"

    # 3. Test History Logging
    history = await assistant.get_chat_history(user_id=user.id)
    assert len(history) >= 2
