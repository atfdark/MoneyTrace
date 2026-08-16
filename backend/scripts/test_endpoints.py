"""Test script for Phase 5 Fraud Detection Engine API endpoints."""

import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.database import async_session
from sqlalchemy import select


async def test_fraud_endpoints():
    """Test FastAPI fraud endpoints using ASGITransport."""
    async with async_session() as session:
        # Get admin user for auth token
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
        print("\n--- 1. Testing GET /api/v1/fraud/stats ---")
        res_stats = await client.get("/api/v1/fraud/stats", headers=headers)
        print(f"Status: {res_stats.status_code}")
        print(f"Data: {res_stats.json()}")
        assert res_stats.status_code == 200

        print("\n--- 2. Testing GET /api/v1/fraud/alerts ---")
        res_alerts = await client.get("/api/v1/fraud/alerts", headers=headers)
        print(f"Status: {res_alerts.status_code}")
        alerts_data = res_alerts.json()
        print(f"Total Alerts: {alerts_data['total']}, Returned: {len(alerts_data['alerts'])}")
        assert res_alerts.status_code == 200
        assert len(alerts_data["alerts"]) > 0

        first_alert_id = alerts_data["alerts"][0]["alert_id"]
        first_txn_id = alerts_data["alerts"][0]["transaction_id"]

        print(f"\n--- 3. Testing GET /api/v1/fraud/alerts/{first_alert_id} ---")
        res_detail = await client.get(f"/api/v1/fraud/alerts/{first_alert_id}", headers=headers)
        print(f"Status: {res_detail.status_code}")
        print(f"Alert ID: {res_detail.json()['alert_id']}, Risk: {res_detail.json()['risk_score']}")
        assert res_detail.status_code == 200

        print("\n--- 4. Testing GET /api/v1/fraud/high-risk ---")
        res_hr = await client.get("/api/v1/fraud/high-risk", headers=headers)
        print(f"Status: {res_hr.status_code}")
        print(f"High Risk Count: {res_hr.json()['total']}")
        assert res_hr.status_code == 200

        print(f"\n--- 5. Testing POST /api/v1/fraud/analyze/{first_txn_id} ---")
        res_analyze = await client.post(f"/api/v1/fraud/analyze/{first_txn_id}", headers=headers)
        print(f"Status: {res_analyze.status_code}")
        print(f"Analysis Result: {res_analyze.json()}")
        assert res_analyze.status_code == 200

        print(f"\n--- 6. Testing PATCH /api/v1/fraud/alerts/{first_alert_id}/status ---")
        res_patch = await client.patch(
            f"/api/v1/fraud/alerts/{first_alert_id}/status",
            headers=headers,
            json={"status": "FALSE_POSITIVE"},
        )
        print(f"Status: {res_patch.status_code}")
        print(f"New Status: {res_patch.json()['status']}")
        assert res_patch.status_code == 200
        assert res_patch.json()["status"] == "FALSE_POSITIVE"

        print("\n[OK] ALL 6 FRAUD ENDPOINTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_fraud_endpoints())
