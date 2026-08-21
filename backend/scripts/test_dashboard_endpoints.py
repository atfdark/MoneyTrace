"""Test script for Phase 8 Dashboard Analytics API endpoints."""

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


async def test_dashboard_endpoints():
    """Test all 10 FastAPI dashboard analytics endpoints."""
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
        print("\n--- 1. Testing GET /api/v1/dashboard/overview ---")
        res = await client.get("/api/v1/dashboard/overview", headers=headers)
        print(f"Status: {res.status_code}")
        data = res.json()
        print(f"Total Transactions: {data['total_transactions']}, Total Alerts: {data['fraud_alerts']}, Money At Risk: INR {data['money_at_risk']:,.2f}")
        assert res.status_code == 200
        assert data["total_transactions"] >= 0

        print("\n--- 2. Testing GET /api/v1/dashboard/live ---")
        res = await client.get("/api/v1/dashboard/live", headers=headers)
        print(f"Status: {res.status_code}")
        live = res.json()
        print(f"Active Alerts: {live['active_alerts']}, Critical: {live['critical_alerts']}, Txns/Min: {live['transactions_last_minute']}")
        assert res.status_code == 200

        print("\n--- 3. Testing GET /api/v1/dashboard/transactions ---")
        res = await client.get("/api/v1/dashboard/transactions", headers=headers)
        print(f"Status: {res.status_code}")
        txns = res.json()
        print(f"Monthly Txns: {txns['monthly_transactions']}, Avg Amount: INR {txns['average_transaction_amount']}, Highest: INR {txns['highest_transaction']}")
        assert res.status_code == 200
        assert len(txns["volume_trend"]) > 0

        print("\n--- 4. Testing GET /api/v1/dashboard/fraud ---")
        res = await client.get("/api/v1/dashboard/fraud", headers=headers)
        print(f"Status: {res.status_code}")
        fraud = res.json()
        print(f"Severities: {fraud['severity_breakdown']}")
        print(f"Rule Counts: {fraud['rule_breakdown']}")
        assert res.status_code == 200

        print("\n--- 5. Testing GET /api/v1/dashboard/recovery ---")
        res = await client.get("/api/v1/dashboard/recovery", headers=headers)
        print(f"Status: {res.status_code}")
        rec = res.json()
        print(f"High Prob: {rec['high_probability_cases']}, Success Rate: {rec['recovery_success_rate']}%, Avg Score: {rec['average_recovery_score']}")
        assert res.status_code == 200

        print("\n--- 6. Testing GET /api/v1/dashboard/locations ---")
        res = await client.get("/api/v1/dashboard/locations", headers=headers)
        print(f"Status: {res.status_code}")
        loc = res.json()
        print(f"Top Locations: {loc['top_locations']}")
        print(f"Travel Corridors: {loc['travel_corridors']}")
        assert res.status_code == 200

        print("\n--- 7. Testing GET /api/v1/dashboard/risky-accounts ---")
        res = await client.get("/api/v1/dashboard/risky-accounts?limit=10", headers=headers)
        print(f"Status: {res.status_code}")
        risky = res.json()
        print(f"Top Risky Account #1: {risky['accounts'][0]['account_number']} (Score: {risky['accounts'][0]['composite_score']})")
        assert res.status_code == 200
        assert len(risky["accounts"]) > 0

        print("\n--- 8. Testing GET /api/v1/dashboard/trends ---")
        res = await client.get("/api/v1/dashboard/trends?days=30", headers=headers)
        print(f"Status: {res.status_code}")
        trends = res.json()
        print(f"Trend Points Returned: {len(trends['trends'])}")
        assert res.status_code == 200
        assert len(trends["trends"]) == 30

        print("\n--- 9. Testing GET /api/v1/dashboard/investigators ---")
        res = await client.get("/api/v1/dashboard/investigators", headers=headers)
        print(f"Status: {res.status_code}")
        invs = res.json()
        print(f"Leaderboard #1: {invs['leaderboard'][0]['name']} (Closed: {invs['leaderboard'][0]['cases_closed']}, Avg Time: {invs['leaderboard'][0]['average_resolution_time_hours']} hrs)")
        assert res.status_code == 200
        assert len(invs["leaderboard"]) > 0

        print("\n--- 10. Testing GET /api/v1/dashboard/export ---")
        res_json = await client.get("/api/v1/dashboard/export?format=json", headers=headers)
        print(f"JSON Export Status: {res_json.status_code}")
        assert res_json.status_code == 200

        res_csv = await client.get("/api/v1/dashboard/export?format=csv", headers=headers)
        print(f"CSV Export Status: {res_csv.status_code}")
        assert res_csv.status_code == 200
        assert "MONEYTRACE DASHBOARD ANALYTICS EXPORT" in res_csv.text

        print("\n[OK] ALL 10 PHASE 8 DASHBOARD ENDPOINTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_dashboard_endpoints())
