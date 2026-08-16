"""Reports & Export Pydantic schemas — Phase 10."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class InvestigationReportData(BaseModel):
    """Investigation dossier data model."""
    model_config = ConfigDict(from_attributes=True)

    case_id: str
    alert_id: str
    transaction_id: str
    victim_account: str
    current_holder_account: str
    fraud_type: str
    risk_score: float
    severity: str
    money_trail: List[str]
    amount_at_risk: float
    recovery_score: float
    recovery_probability: str
    recommended_action: str
    generated_date: datetime


class FraudReportData(BaseModel):
    """Fraud alert report data model."""
    model_config = ConfigDict(from_attributes=True)

    alert_id: str
    transaction_id: str
    amount: float
    risk_score: float
    severity: str
    triggered_rules: List[str]
    score_breakdown: Dict[str, float]
    recommended_action: str
    generated_date: datetime


class RecoveryReportData(BaseModel):
    """Recovery intelligence report data model."""
    model_config = ConfigDict(from_attributes=True)

    case_id: str
    current_holder: str
    amount_at_risk: float
    recovery_score: float
    recovery_probability: str
    money_trail: List[str]
    recommended_action: str
    generated_date: datetime


class DashboardReportData(BaseModel):
    """Executive dashboard summary data model."""
    model_config = ConfigDict(from_attributes=True)

    total_transactions: int
    total_amount_processed: float
    total_fraud_alerts: int
    critical_alerts: int
    open_recovery_cases: int
    recovered_cases: int
    money_at_risk: float
    money_recovered: float
    generated_date: datetime


class ReportHistoryItem(BaseModel):
    """Metadata item for an archived report artifact."""
    file_name: str
    report_type: str  # INVESTIGATION, FRAUD, RECOVERY, DASHBOARD, EXPORT
    format: str       # PDF, DOCX, CSV, XLSX
    size_bytes: int
    generated_at: datetime
    download_url: str


class ReportHistoryResponse(BaseModel):
    """List of generated report files."""
    reports: List[ReportHistoryItem]
    total: int
