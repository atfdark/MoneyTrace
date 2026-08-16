"""Reports & Export Engine endpoints — Phase 10."""

from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User
from app.schemas.reports import ReportHistoryResponse
from app.services.report_generator import ReportGenerator, BASE_STORAGE

router = APIRouter()


# ---------------------------------------------------------------------------
# 1. Investigation Reports (PDF & DOCX)
# ---------------------------------------------------------------------------

@router.get("/investigation/{case_id}/pdf")
async def download_investigation_pdf(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Generate and download PDF investigation dossier with money trail and charts."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.generate_investigation_pdf(case_id)
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/investigation/{case_id}/docx")
async def download_investigation_docx(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Generate and download Microsoft Word DOCX investigation dossier."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.generate_investigation_docx(case_id)
    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )


# ---------------------------------------------------------------------------
# 2. Fraud Alert Reports (PDF & DOCX)
# ---------------------------------------------------------------------------

@router.get("/fraud/{alert_id}/pdf")
async def download_fraud_pdf(
    alert_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Generate and download PDF fraud incident report."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.generate_fraud_pdf(alert_id)
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/fraud/{alert_id}/docx")
async def download_fraud_docx(
    alert_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Generate and download Microsoft Word DOCX fraud incident report."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.generate_fraud_docx(alert_id)
    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )


# ---------------------------------------------------------------------------
# 3. Recovery Reports (PDF & DOCX)
# ---------------------------------------------------------------------------

@router.get("/recovery/{case_id}/pdf")
async def download_recovery_pdf(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Generate and download PDF asset recovery report."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.generate_recovery_pdf(case_id)
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/recovery/{case_id}/docx")
async def download_recovery_docx(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Generate and download DOCX asset recovery report."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.generate_recovery_docx(case_id)
    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )


# ---------------------------------------------------------------------------
# 4. Executive Dashboard Reports (PDF & DOCX)
# ---------------------------------------------------------------------------

@router.get("/dashboard/pdf")
async def download_dashboard_pdf(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Generate and download PDF executive dashboard summary."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.generate_dashboard_pdf()
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/dashboard/docx")
async def download_dashboard_docx(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Generate and download DOCX executive dashboard summary."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.generate_dashboard_docx()
    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )


# ---------------------------------------------------------------------------
# 5. Raw CSV Exports
# ---------------------------------------------------------------------------

@router.get("/export/transactions")
async def export_transactions_csv(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Export transactions as CSV file."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.export_transactions_csv()
    return FileResponse(
        path=str(file_path),
        media_type="text/csv",
        filename=filename,
    )


@router.get("/export/alerts")
async def export_alerts_csv(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Export fraud alerts as CSV file."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.export_alerts_csv()
    return FileResponse(
        path=str(file_path),
        media_type="text/csv",
        filename=filename,
    )


@router.get("/export/recovery")
async def export_recovery_csv(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Export recovery cases as CSV file."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.export_recovery_csv()
    return FileResponse(
        path=str(file_path),
        media_type="text/csv",
        filename=filename,
    )


@router.get("/export/accounts")
async def export_accounts_csv(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Export accounts as CSV file."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.export_accounts_csv()
    return FileResponse(
        path=str(file_path),
        media_type="text/csv",
        filename=filename,
    )


# ---------------------------------------------------------------------------
# 6. Multi-Tab Excel Workbook Export
# ---------------------------------------------------------------------------

@router.get("/export/dashboard")
async def export_dashboard_xlsx(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Export full multi-tab executive workbook (.xlsx) via openpyxl."""
    generator = ReportGenerator(session)
    file_path, filename = await generator.export_dashboard_xlsx()
    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )


# ---------------------------------------------------------------------------
# 7. Report History / Archive
# ---------------------------------------------------------------------------

@router.get("/history", response_model=ReportHistoryResponse)
async def get_report_history(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> ReportHistoryResponse:
    """Get list of all generated reports in local storage."""
    generator = ReportGenerator(session)
    items = await generator.get_report_history()
    return ReportHistoryResponse(reports=items, total=len(items))


@router.get("/download/{fmt}/{filename}")
async def download_archived_report(
    fmt: str,
    filename: str,
    current_user: User = Depends(get_current_active_user),
) -> FileResponse:
    """Download an existing generated report file by format and filename."""
    target_dir = BASE_STORAGE / fmt.lower()
    file_path = target_dir / filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Report file '{filename}' not found")

    mime_map = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "csv": "text/csv",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    media_type = mime_map.get(fmt.lower(), "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=filename,
    )
