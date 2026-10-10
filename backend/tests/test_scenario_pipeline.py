import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.user import User
from app.core.security import create_access_token


from app.database import async_session
from app.core.security import hash_password
from decimal import Decimal
import uuid
import datetime

@pytest.fixture
async def auth_token():
    async with async_session() as session:
        user = User(
            id=uuid.uuid4(),
            email=f"test_{uuid.uuid4()}@moneytrace.dev",
            full_name="Test User",
            password_hash=hash_password("password"),
            is_active=True,
            role="investigator"
        )
        session.add(user)
        
        acc = Account(
            id=uuid.uuid4(),
            account_number=f"ACC{uuid.uuid4().hex[:8].upper()}",
            user_id=user.id,
            balance=Decimal("10000.00"),
            status="active"
        )
        session.add(acc)
        
        user2 = User(
            id=uuid.uuid4(),
            email=f"test_{uuid.uuid4()}@moneytrace.dev",
            full_name="Test User 2",
            password_hash=hash_password("password"),
            is_active=True,
            role="investigator"
        )
        session.add(user2)
        
        recv = Account(
            id=uuid.uuid4(),
            account_number=f"RECV{uuid.uuid4().hex[:8].upper()}",
            user_id=user2.id,
            balance=Decimal("0.00"),
            status="active"
        )
        session.add(recv)
        
        await session.commit()
        return create_access_token(user.id), recv.account_number


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://testserver")


@pytest.mark.asyncio
async def test_create_simulation_transaction(client: AsyncClient, auth_token: tuple[str, str]):
    token, recv_acc = auth_token
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Verify schema compatibility and valid persistence for operational transactions
    operational_req = {
        "receiver_account_number": recv_acc,
        "amount": 500.0,
        "remark": "Operational Test"
    }
    res = await client.post("/api/v1/transactions/send", json=operational_req, headers=headers)
    assert res.status_code == 201, f"Failed with {res.status_code}: {res.json()}"
    
    op_data = res.json()
    assert op_data["is_simulation"] is False
    assert op_data["scenario_id"] is None
    
    # 2. Verify scenario provenance fields for simulated transactions
    sim_req = {
        "receiver_account_number": recv_acc,
        "amount": 600.0,
        "remark": "Simulation Test",
        "is_simulation": True,
        "scenario_id": "SCENARIO_123"
    }
    sim_res = await client.post("/api/v1/transactions/send", json=sim_req, headers=headers)
    assert sim_res.status_code == 201
    
    sim_data = sim_res.json()
    assert sim_data["is_simulation"] is True
    assert sim_data["scenario_id"] == "SCENARIO_123"
    
    # 3. Verify separation in DB
    async with async_session() as db_session:
        db_res = await db_session.execute(select(Transaction).where(Transaction.transaction_id == op_data["transaction_id"]))
        db_op_txn = db_res.scalar_one()
        assert db_op_txn.is_simulation is False
        assert db_op_txn.scenario_id is None
        
        db_res2 = await db_session.execute(select(Transaction).where(Transaction.transaction_id == sim_data["transaction_id"]))
        db_sim_txn = db_res2.scalar_one()
        assert db_sim_txn.is_simulation is True
        assert db_sim_txn.scenario_id == "SCENARIO_123"
