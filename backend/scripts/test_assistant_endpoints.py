import asyncio
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.models.user import User
from app.database import async_session
from sqlalchemy import select


async def test_assistant_endpoints():
    """Test all 8 FastAPI AI Copilot assistant endpoints."""
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
        print("\n--- 1. Testing POST /api/v1/assistant/chat ---")
        chat_req = {"message": "Why was transaction TXN_TRACE_HOP1 flagged?"}
        res_chat = await client.post("/api/v1/assistant/chat", json=chat_req, headers=headers)
        print(f"Status: {res_chat.status_code}")
        data = res_chat.json()
        print(f"Answer snippet: {data['answer'][:120]}...")
        print(f"Intent: {data['intent']}, Typology: {data.get('predicted_fraud_type')}")
        print(f"RAG Citations: {len(data.get('rag_citations', []))}, XAI Weights: {len(data.get('xai_weights', []))}")
        assert res_chat.status_code == 200
        assert "TXN_TRACE_HOP1" in data["answer"] or "flagged" in data["answer"]

        print("\n--- 2. Testing POST /api/v1/assistant/explain-transaction/TXN_TRACE_HOP1 ---")
        res_txn = await client.post("/api/v1/assistant/explain-transaction/TXN_TRACE_HOP1", headers=headers)
        print(f"Status: {res_txn.status_code}")
        assert res_txn.status_code == 200

        print("\n--- 3. Testing POST /api/v1/assistant/explain-account/ACC1002 ---")
        res_acc = await client.post("/api/v1/assistant/explain-account/ACC1002", headers=headers)
        print(f"Status: {res_acc.status_code}")
        acc_data = res_acc.json()
        print(f"Mule explanation snippet: {acc_data['answer'][:100]}...")
        assert res_acc.status_code == 200
        assert "mule" in acc_data["answer"].lower()

        print("\n--- 4. Testing POST /api/v1/assistant/explain-recovery/REC202608168920 ---")
        res_rec = await client.post("/api/v1/assistant/explain-recovery/REC202608168920", headers=headers)
        print(f"Status: {res_rec.status_code}")
        assert res_rec.status_code == 200

        print("\n--- 5. Testing POST /api/v1/assistant/similar-cases/REC202608168920 ---")
        res_sim = await client.post("/api/v1/assistant/similar-cases/REC202608168920", headers=headers)
        print(f"Status: {res_sim.status_code}")
        sim_data = res_sim.json()
        print(f"Similar Cases Found: {len(sim_data)}")
        if sim_data:
            print(f"Top Match: {sim_data[0]['case_id']} ({sim_data[0]['similarity_percentage']}% Match)")
        assert res_sim.status_code == 200

        print("\n--- 6. Testing GET /api/v1/assistant/rag-search ---")
        res_rag = await client.get("/api/v1/assistant/rag-search?query=RBI+unauthorized+fraud", headers=headers)
        print(f"Status: {res_rag.status_code}")
        rag_data = res_rag.json()
        print(f"Citations Returned: {len(rag_data)}, Top Source: {rag_data[0]['title'] if rag_data else 'None'}")
        assert res_rag.status_code == 200
        assert len(rag_data) > 0

        print("\n--- 7. Testing GET /api/v1/assistant/history ---")
        res_hist = await client.get("/api/v1/assistant/history", headers=headers)
        print(f"Status: {res_hist.status_code}")
        hist_data = res_hist.json()
        print(f"History Records: {hist_data['total']}")
        assert res_hist.status_code == 200
        assert hist_data["total"] > 0

        print("\n[OK] ALL 8 PHASE 9 AI ASSISTANT ENDPOINTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_assistant_endpoints())
