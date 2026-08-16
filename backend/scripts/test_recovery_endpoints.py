"""Test script for Phase 7 Recovery Intelligence API endpoints."""

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


async def test_recovery_endpoints():
    """Test all FastAPI recovery intelligence endpoints."""
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
        print("\n--- 1. Testing GET /api/v1/recovery/stats ---")
        res_stats = await client.get("/api/v1/recovery/stats", headers=headers)
        print(f"Status: {res_stats.status_code}")
        print(f"Data: {res_stats.json()}")
        assert res_stats.status_code == 200

        print("\n--- 2. Testing GET /api/v1/recovery/cases ---")
        res_cases = await client.get("/api/v1/recovery/cases", headers=headers)
        print(f"Status: {res_cases.status_code}")
        cases_data = res_cases.json()
        print(f"Total Cases: {cases_data['total']}, Returned: {len(cases_data['cases'])}")
        assert res_cases.status_code == 200
        assert len(cases_data["cases"]) > 0

        first_case_id = cases_data["cases"][0]["case_id"]
        first_alert_id = cases_data["cases"][0]["alert_id"]

        print(f"\n--- 3. Testing GET /api/v1/recovery/cases/{first_case_id} ---")
        res_detail = await client.get(f"/api/v1/recovery/cases/{first_case_id}", headers=headers)
        print(f"Status: {res_detail.status_code}")
        detail = res_detail.json()
        print(f"Case ID: {detail['case_id']}, Score: {detail['recovery_score']}, Prob: {detail['recovery_probability']}")
        print(f"Holder: {detail['current_holder_account']}, Action: '{detail['recommended_action']}'")
        assert res_detail.status_code == 200

        print("\n--- 4. Testing GET /api/v1/recovery/high-probability ---")
        res_high = await client.get("/api/v1/recovery/high-probability", headers=headers)
        print(f"Status: {res_high.status_code}")
        print(f"High Prob Cases Count: {res_high.json()['total']}")
        assert res_high.status_code == 200

        print(f"\n--- 5. Testing POST /api/v1/recovery/analyze/{first_alert_id} ---")
        res_analyze = await client.post(f"/api/v1/recovery/analyze/{first_alert_id}", headers=headers)
        print(f"Status: {res_analyze.status_code}")
        print(f"Analyzed Case: {res_analyze.json()['case_id']}")
        assert res_analyze.status_code == 200

        print(f"\n--- 6. Testing POST /api/v1/recovery/recalculate/{first_case_id} ---")
        res_recalc = await client.post(f"/api/v1/recovery/recalculate/{first_case_id}", headers=headers)
        print(f"Status: {res_recalc.status_code}")
        print(f"Recalculated Score: {res_recalc.json()['recovery_score']}")
        assert res_recalc.status_code == 200

        print("\n[OK] ALL PHASE 7 RECOVERY ENDPOINTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_recovery_endpoints())
