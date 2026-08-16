"""Unit tests for Phase 6 – Money Flow Graph Analysis using NetworkX."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.account import Account
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User
from app.services.graph_engine import GraphEngine

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def async_session():
    """Fixture providing an async database session with initialized tables."""
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE fraud_alerts ADD COLUMN rule_breakdown JSON"))
        except Exception:
            pass

    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_graph_construction_and_tracing(async_session: AsyncSession):
    """Test NetworkX graph building and multi-hop money flow tracing."""
    user = User(id=uuid4(), full_name="Graph Test User", email="guser@test.dev", password_hash="pass")
    acc1 = Account(id=uuid4(), account_number="ACC_T101", user_id=user.id, balance=Decimal("100000.00"))
    acc2 = Account(id=uuid4(), account_number="ACC_T102", user_id=user.id, balance=Decimal("50000.00"))
    acc3 = Account(id=uuid4(), account_number="ACC_T103", user_id=user.id, balance=Decimal("50000.00"))
    acc4 = Account(id=uuid4(), account_number="ACC_T104", user_id=user.id, balance=Decimal("50000.00"))
    async_session.add_all([user, acc1, acc2, acc3, acc4])
    await async_session.flush()

    base_time = datetime.now(timezone.utc) - timedelta(hours=1)

    # Hop 1: T101 -> T102
    t1 = Transaction(
        id=uuid4(),
        transaction_id="TXN_G1",
        sender_account_id=acc1.id,
        receiver_account_id=acc2.id,
        amount=Decimal("50000.00"),
        status=TransactionStatus.COMPLETED.value,
        timestamp=base_time,
    )
    # Hop 2: T102 -> T103
    t2 = Transaction(
        id=uuid4(),
        transaction_id="TXN_G2",
        sender_account_id=acc2.id,
        receiver_account_id=acc3.id,
        amount=Decimal("49000.00"),
        status=TransactionStatus.COMPLETED.value,
        timestamp=base_time + timedelta(minutes=5),
    )
    # Hop 3: T103 -> T104
    t3 = Transaction(
        id=uuid4(),
        transaction_id="TXN_G3",
        sender_account_id=acc3.id,
        receiver_account_id=acc4.id,
        amount=Decimal("48000.00"),
        status=TransactionStatus.COMPLETED.value,
        timestamp=base_time + timedelta(minutes=10),
    )
    async_session.add_all([t1, t2, t3])
    await async_session.commit()

    engine = GraphEngine(async_session)

    # Test graph construction
    G, accounts_map, transactions_map = await engine.build_networkx_graph()
    assert G.number_of_nodes() >= 4
    assert G.number_of_edges() >= 3

    # Test money flow tracing from TXN_G1
    trace_res = await engine.trace_money_flow("TXN_G1")
    assert trace_res.source_account == "ACC_T101"
    assert trace_res.money_path == ["ACC_T102", "ACC_T103", "ACC_T104"]
    assert trace_res.current_holder == "ACC_T104"
    assert trace_res.total_hops == 3
    assert trace_res.initial_amount == 50000.0
    assert trace_res.remaining_amount == 48000.0


@pytest.mark.asyncio
async def test_circular_ring_detection(async_session: AsyncSession):
    """Test detection of circular money laundering cycles (A -> B -> C -> A)."""
    user = User(id=uuid4(), full_name="Ring User", email="ring@test.dev", password_hash="pass")
    acc_a = Account(id=uuid4(), account_number="ACC_CA", user_id=user.id, balance=Decimal("100000.00"))
    acc_b = Account(id=uuid4(), account_number="ACC_CB", user_id=user.id, balance=Decimal("100000.00"))
    acc_c = Account(id=uuid4(), account_number="ACC_CC", user_id=user.id, balance=Decimal("100000.00"))
    async_session.add_all([user, acc_a, acc_b, acc_c])
    await async_session.flush()

    now = datetime.now(timezone.utc)
    t_ab = Transaction(id=uuid4(), transaction_id="TXN_AB", sender_account_id=acc_a.id, receiver_account_id=acc_b.id, amount=Decimal("30000.00"), status=TransactionStatus.COMPLETED.value, timestamp=now - timedelta(minutes=30))
    t_bc = Transaction(id=uuid4(), transaction_id="TXN_BC", sender_account_id=acc_b.id, receiver_account_id=acc_c.id, amount=Decimal("29000.00"), status=TransactionStatus.COMPLETED.value, timestamp=now - timedelta(minutes=20))
    t_ca = Transaction(id=uuid4(), transaction_id="TXN_CA", sender_account_id=acc_c.id, receiver_account_id=acc_a.id, amount=Decimal("28000.00"), status=TransactionStatus.COMPLETED.value, timestamp=now - timedelta(minutes=10))
    async_session.add_all([t_ab, t_bc, t_ca])
    await async_session.commit()

    engine = GraphEngine(async_session)
    susp_res = await engine.detect_suspicious_patterns()

    assert len(susp_res.circular_chains) > 0
    cycle_nodes = set(susp_res.circular_chains[0])
    assert {"ACC_CA", "ACC_CB", "ACC_CC"}.issubset(cycle_nodes)
