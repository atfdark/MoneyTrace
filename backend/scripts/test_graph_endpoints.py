"""Test script for Phase 6 Money Flow Graph API endpoints."""

import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.models.user import User
from app.database import async_session
from sqlalchemy import select


async def test_graph_endpoints():
    """Test all FastAPI graph analysis endpoints."""
    async with async_session() as session:
        res = await session.execute(select(User).where(User.email == "admin@moneytrace.dev"))
        admin_user = res.scalar_one_or_none()
        if not admin_user:
            res = await session.execute(select(User))
            admin_user = res.scalars().first()

        assert admin_user is not None, "No user found in database!"

    token = create_access_token(admin_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        print("\n--- 1. Testing GET /api/v1/graph/trace/TXN_TRACE_HOP1 ---")
        res_trace = await client.get("/api/v1/graph/trace/TXN_TRACE_HOP1", headers=headers)
        print(f"Status: {res_trace.status_code}")
        trace_data = res_trace.json()
        print(f"Source Account: {trace_data.get('source_account')}")
        print(f"Money Path: {trace_data.get('money_path')}")
        print(f"Current Holder: {trace_data.get('current_holder')}")
        print(f"Total Hops: {trace_data.get('total_hops')}")
        assert res_trace.status_code == 200
        assert trace_data["source_account"] == "ACC1001"
        assert trace_data["current_holder"] == "ACC1004"
        assert trace_data["money_path"] == ["ACC1002", "ACC1003", "ACC1004"]

        print("\n--- 2. Testing GET /api/v1/graph/account/ACC1002 ---")
        res_acc = await client.get("/api/v1/graph/account/ACC1002", headers=headers)
        print(f"Status: {res_acc.status_code}")
        acc_graph = res_acc.json()
        print(f"Nodes in Neighborhood: {acc_graph.get('total_nodes')}, Edges: {acc_graph.get('total_edges')}")
        assert res_acc.status_code == 200

        print("\n--- 3. Testing GET /api/v1/graph/network ---")
        res_net = await client.get("/api/v1/graph/network", headers=headers)
        print(f"Status: {res_net.status_code}")
        net_data = res_net.json()
        print(f"Total Network Nodes: {net_data.get('total_nodes')}, Total Edges: {net_data.get('total_edges')}")
        assert res_net.status_code == 200
        assert net_data["total_nodes"] > 0

        print("\n--- 4. Testing GET /api/v1/graph/suspicious ---")
        res_susp = await client.get("/api/v1/graph/suspicious", headers=headers)
        print(f"Status: {res_susp.status_code}")
        susp_data = res_susp.json()
        print(f"Circular Chains Found: {susp_data.get('circular_chains')}")
        print(f"Mule Accounts Detected: {len(susp_data.get('mule_accounts', []))}")
        assert res_susp.status_code == 200
        assert len(susp_data["circular_chains"]) > 0

        print("\n[OK] ALL PHASE 6 GRAPH ENDPOINTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_graph_endpoints())
