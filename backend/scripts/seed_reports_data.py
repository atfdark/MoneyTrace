import asyncio
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base
from app.models.fraud_alert import FraudAlert
from app.models.recovery import RecoveryCase
from app.services.report_generator import ReportGenerator


async def seed_reports():
    """Generate initial sample reports across all document formats (PDF, DOCX, CSV, XLSX)."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        generator = ReportGenerator(session)

        # Get first case and alert
        case_res = await session.execute(select(RecoveryCase))
        case = case_res.scalars().first()

        alert_res = await session.execute(select(FraudAlert))
        alert = alert_res.scalars().first()

        case_id = case.case_id if case else "REC202608168920"
        alert_id = alert.alert_id if alert else "ALT20260816051149913"

        print("Generating Phase 10 Sample Multi-Format Reports...")

        # 1. PDFs
        print("  - Generating PDF reports with embedded Matplotlib charts...")
        pdf_inv, _ = await generator.generate_investigation_pdf(case_id)
        print(f"    ✓ {pdf_inv.name}")
        pdf_fraud, _ = await generator.generate_fraud_pdf(alert_id)
        print(f"    ✓ {pdf_fraud.name}")
        pdf_dash, _ = await generator.generate_dashboard_pdf()
        print(f"    ✓ {pdf_dash.name}")

        # 2. DOCX
        print("  - Generating Microsoft Word DOCX dossiers...")
        docx_inv, _ = await generator.generate_investigation_docx(case_id)
        print(f"    ✓ {docx_inv.name}")
        docx_dash, _ = await generator.generate_dashboard_docx()
        print(f"    ✓ {docx_dash.name}")

        # 3. CSVs
        print("  - Generating CSV data streams...")
        csv_txns, _ = await generator.export_transactions_csv()
        print(f"    ✓ {csv_txns.name}")
        csv_alerts, _ = await generator.export_alerts_csv()
        print(f"    ✓ {csv_alerts.name}")
        csv_rec, _ = await generator.export_recovery_csv()
        print(f"    ✓ {csv_rec.name}")

        # 4. Master Excel
        print("  - Generating OpenPyXL Master Excel Workbook...")
        xlsx_master, _ = await generator.export_dashboard_xlsx()
        print(f"    ✓ {xlsx_master.name}")

        # 5. History count
        history = await generator.get_report_history()
        print(f"\n[OK] Phase 10 Reports successfully generated! ({len(history)} files in archive)")


if __name__ == "__main__":
    asyncio.run(seed_reports())
