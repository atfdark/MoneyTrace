"""Test script for Phase 10 Reports & Export API endpoints."""

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
from app.models.recovery import RecoveryCase
from app.models.fraud_alert import FraudAlert
from app.database import async_session
from sqlalchemy import select


async def test_reports_endpoints():
    """Test all 14 FastAPI Reports and Export endpoints."""
    async with async_session() as session:
        res = await session.execute(select(User).where(User.email == "admin@moneytrace.dev"))
        admin_user = res.scalar_one_or_none()
        if not admin_user:
            res = await session.execute(select(User))
            admin_user = res.scalars().first()

        assert admin_user is not None, "No user found in database!"

        case_res = await session.execute(select(RecoveryCase))
        case = case_res.scalars().first()
        case_id = case.case_id if case else "REC202608168920"

        alt_res = await session.execute(select(FraudAlert))
        alert = alt_res.scalars().first()
        alert_id = alert.alert_id if alert else "ALT20260816051148545"

    token = create_access_token(admin_user.id)
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        print("\n--- 1. Testing Investigation PDF & DOCX ---")
        res_inv_pdf = await client.get(f"/api/v1/reports/investigation/{case_id}/pdf", headers=headers)
        print(f"Investigation PDF Status: {res_inv_pdf.status_code}, Bytes: {len(res_inv_pdf.content)}")
        assert res_inv_pdf.status_code == 200
        assert len(res_inv_pdf.content) > 1000

        res_inv_docx = await client.get(f"/api/v1/reports/investigation/{case_id}/docx", headers=headers)
        print(f"Investigation DOCX Status: {res_inv_docx.status_code}, Bytes: {len(res_inv_docx.content)}")
        assert res_inv_docx.status_code == 200
        assert len(res_inv_docx.content) > 1000

        print("\n--- 2. Testing Fraud Report PDF & DOCX ---")
        res_fraud_pdf = await client.get(f"/api/v1/reports/fraud/{alert_id}/pdf", headers=headers)
        print(f"Fraud PDF Status: {res_fraud_pdf.status_code}")
        assert res_fraud_pdf.status_code == 200

        res_fraud_docx = await client.get(f"/api/v1/reports/fraud/{alert_id}/docx", headers=headers)
        print(f"Fraud DOCX Status: {res_fraud_docx.status_code}")
        assert res_fraud_docx.status_code == 200

        print("\n--- 3. Testing Recovery Report PDF & DOCX ---")
        res_rec_pdf = await client.get(f"/api/v1/reports/recovery/{case_id}/pdf", headers=headers)
        print(f"Recovery PDF Status: {res_rec_pdf.status_code}")
        assert res_rec_pdf.status_code == 200

        res_rec_docx = await client.get(f"/api/v1/reports/recovery/{case_id}/docx", headers=headers)
        print(f"Recovery DOCX Status: {res_rec_docx.status_code}")
        assert res_rec_docx.status_code == 200

        print("\n--- 4. Testing Dashboard Report PDF & DOCX ---")
        res_dash_pdf = await client.get("/api/v1/reports/dashboard/pdf", headers=headers)
        print(f"Dashboard PDF Status: {res_dash_pdf.status_code}")
        assert res_dash_pdf.status_code == 200

        res_dash_docx = await client.get("/api/v1/reports/dashboard/docx", headers=headers)
        print(f"Dashboard DOCX Status: {res_dash_docx.status_code}")
        assert res_dash_docx.status_code == 200

        print("\n--- 5. Testing CSV Exports ---")
        res_txns_csv = await client.get("/api/v1/reports/export/transactions", headers=headers)
        print(f"Transactions CSV Status: {res_txns_csv.status_code}")
        assert res_txns_csv.status_code == 200
        assert "Transaction ID" in res_txns_csv.text

        res_alerts_csv = await client.get("/api/v1/reports/export/alerts", headers=headers)
        print(f"Alerts CSV Status: {res_alerts_csv.status_code}")
        assert res_alerts_csv.status_code == 200
        assert "Alert ID" in res_alerts_csv.text

        res_rec_csv = await client.get("/api/v1/reports/export/recovery", headers=headers)
        print(f"Recovery CSV Status: {res_rec_csv.status_code}")
        assert res_rec_csv.status_code == 200
        assert "Case ID" in res_rec_csv.text

        res_acc_csv = await client.get("/api/v1/reports/export/accounts", headers=headers)
        print(f"Accounts CSV Status: {res_acc_csv.status_code}")
        assert res_acc_csv.status_code == 200
        assert "Account Number" in res_acc_csv.text

        print("\n--- 6. Testing Excel (XLSX) Master Export ---")
        res_xlsx = await client.get("/api/v1/reports/export/dashboard", headers=headers)
        print(f"Dashboard Excel XLSX Status: {res_xlsx.status_code}, Bytes: {len(res_xlsx.content)}")
        assert res_xlsx.status_code == 200
        assert len(res_xlsx.content) > 1000

        print("\n--- 7. Testing Report History ---")
        res_hist = await client.get("/api/v1/reports/history", headers=headers)
        print(f"Report History Status: {res_hist.status_code}, Total Reports: {res_hist.json()['total']}")
        assert res_hist.status_code == 200
        assert res_hist.json()["total"] > 0

        print("\n[OK] ALL 14 PHASE 10 REPORTS & EXPORT ENDPOINTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_reports_endpoints())
