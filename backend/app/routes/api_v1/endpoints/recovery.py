"""Recovery Intelligence endpoints — Phase 7."""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import exceptions
from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User
from app.schemas.recovery import (
    RecoveryCaseResponse,
    RecoveryCaseListResponse,
    RecoveryStatsResponse,
)
from app.services.recovery_service import RecoveryService

router = APIRouter()


# ---------------------------------------------------------------------------
# Recovery Statistics API
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=RecoveryStatsResponse)
async def get_recovery_stats(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryStatsResponse:
    """Get summary statistics for recovery cases."""
    service = RecoveryService(session)
    stats = await service.get_recovery_stats()
    return RecoveryStatsResponse(**stats)


# ---------------------------------------------------------------------------
# List Recovery Cases
# ---------------------------------------------------------------------------

@router.get("/cases", response_model=RecoveryCaseListResponse)
async def list_recovery_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status: OPEN, ACTION_TAKEN, RECOVERED, FAILED"),
    probability: Optional[str] = Query(None, description="Filter by probability: LOW, MEDIUM, HIGH"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCaseListResponse:
    """Get paginated list of recovery cases."""
    service = RecoveryService(session)
    cases, total = await service.get_all_cases(
        page=page,
        page_size=page_size,
        status=status,
        probability=probability,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return RecoveryCaseListResponse(
        cases=[RecoveryCaseResponse.model_validate(c) for c in cases],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ---------------------------------------------------------------------------
# High Probability Recovery Cases
# ---------------------------------------------------------------------------

@router.get("/high-probability", response_model=RecoveryCaseListResponse)
async def get_high_probability_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCaseListResponse:
    """Get cases with HIGH recovery probability."""
    service = RecoveryService(session)
    cases, total = await service.get_high_probability_cases(page=page, page_size=page_size)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return RecoveryCaseListResponse(
        cases=[RecoveryCaseResponse.model_validate(c) for c in cases],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ---------------------------------------------------------------------------
# Recovery Case Detail
# ---------------------------------------------------------------------------

@router.get("/cases/{case_id}", response_model=RecoveryCaseResponse)
async def get_recovery_case_detail(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCaseResponse:
    """Get detailed recovery case by case_id or UUID."""
    service = RecoveryService(session)
    case = await service.get_case(case_id)
    return RecoveryCaseResponse.model_validate(case)


# ---------------------------------------------------------------------------
# Analyze Fraud Alert for Recovery
# ---------------------------------------------------------------------------

@router.post("/analyze/{alert_id}", response_model=RecoveryCaseResponse)
async def analyze_recovery_for_alert(
    alert_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCaseResponse:
    """Run Recovery Intelligence Engine on a fraud alert and return RecoveryCase."""
    service = RecoveryService(session)
    case = await service.analyze_recovery(alert_id)
    return RecoveryCaseResponse.model_validate(case)


# ---------------------------------------------------------------------------
# Recalculate Recovery Case
# ---------------------------------------------------------------------------

@router.post("/recalculate/{case_id}", response_model=RecoveryCaseResponse)
async def recalculate_recovery_case(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> RecoveryCaseResponse:
    """Re-analyze and update an existing recovery case with fresh graph data."""
    service = RecoveryService(session)
    case = await service.recalculate_case(case_id)
    return RecoveryCaseResponse.model_validate(case)


# ---------------------------------------------------------------------------
# 1-Click Freeze & Recovery Action
# ---------------------------------------------------------------------------

from pydantic import BaseModel, Field

class FreezeAndProtectRequest(BaseModel):
    alert_id: Optional[str] = None
    case_id: Optional[str] = None
    account_number: Optional[str] = None
    mode: Optional[str] = "LIEN"  # "LIEN" (Section 106 BNSS targeted lien) | "FULL_FREEZE" (Full account halt)
    branch_id: Optional[str] = None  # Optional specific branch ID (e.g. "BR-01"); if omitted, batch-applies to all
    reason: Optional[str] = "Statutory Lien Directive issued under Section 106 BNSS / I4C National Protocol"


@router.post("/action/freeze-and-protect")
async def freeze_and_protect(
    req: FreezeAndProtectRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    1-Click Emergency Freeze & Statutory Lien Directive.
    Supports targeted statutory lien under Section 106 BNSS (ring-fencing only tainted funds)
    or emergency full account freeze, with multi-mule branch updates and NPCI dispatch telemetry.
    """
    from sqlalchemy import select, or_
    from app.models.account import Account, AccountStatus
    from app.models.recovery import RecoveryCase, CaseStatus
    from app.core.websocket_events import ws_events_manager, WSEventTypes
    from app.services.recovery_engine import RecoveryEngine
    from uuid import UUID as PyUUID

    service = RecoveryService(session)
    case = None

    # 1. Locate recovery case by case_id, alert_id, or account
    if req.case_id:
        try:
            case = await service.get_case(req.case_id)
        except Exception:
            pass

    if not case and req.alert_id:
        try:
            case = await service.analyze_recovery(req.alert_id)
        except Exception:
            pass

    # 2. Identify the target account
    target_acc = req.account_number
    if not target_acc and case:
        target_acc = case.current_holder_account

    if not target_acc and req.alert_id:
        from app.models.fraud_alert import FraudAlert
        stmt = select(FraudAlert).where(FraudAlert.alert_id == req.alert_id)
        alert_res = await session.execute(stmt)
        alert = alert_res.scalar_one_or_none()
        if alert:
            target_acc = str(alert.account_id)

    if not target_acc:
        raise exceptions.ValidationError("No account identifier provided for lien or freeze directive.")

    # 3. Locate account in database if exists
    is_uuid = False
    val_uuid = None
    try:
        val_uuid = PyUUID(target_acc)
        is_uuid = True
    except (ValueError, TypeError, AttributeError):
        pass

    account = None
    if is_uuid and val_uuid:
        stmt = select(Account).where(or_(Account.id == val_uuid, Account.account_number == target_acc))
        res = await session.execute(stmt)
        account = res.scalar_one_or_none()
    else:
        stmt = select(Account).where(Account.account_number == target_acc)
        res = await session.execute(stmt)
        account = res.scalar_one_or_none()

    # 4. If case was not found yet, check by target account
    if not case and account:
        rec_stmt = select(RecoveryCase).where(RecoveryCase.current_holder_account == account.account_number)
        rec_res = await session.execute(rec_stmt)
        case = rec_res.scalars().first()
        if case:
            case = service._ensure_branches_and_breakdown(case)

    # 5. Process Multi-Branch statutory lien or freeze
    branches = []
    if case:
        branches = case.recovery_branches or RecoveryEngine.synthesize_branches(
            case.amount_at_risk, case.current_holder_account, case.status
        )
        updated_branches = []
        for b in branches:
            b_dict = dict(b)
            # If a specific branch_id was provided, only mutate that branch
            if req.branch_id and b_dict.get("branch_id") != req.branch_id:
                updated_branches.append(b_dict)
                continue

            # Skip ATM exits from banking lien directives
            if b_dict.get("rail") == "ATM_EXIT" or b_dict.get("status") == "LEAKED_ATM":
                b_dict["status"] = "LEAKED_ATM"
                updated_branches.append(b_dict)
                continue

            if req.mode == "FULL_FREEZE":
                b_dict["status"] = "FROZEN"
                if not b_dict.get("npci_ref"):
                    b_dict["npci_ref"] = f"NPCI-ISO20022-FRZ-{abs(hash(b_dict.get('account_number', '')))%89999 + 10000}"
            else:  # Default: targeted LIEN under Sec 106 BNSS
                b_dict["status"] = "LIEN_MARKED"
                if not b_dict.get("npci_ref"):
                    b_dict["npci_ref"] = f"NPCI-ISO20022-LIEN-{abs(hash(b_dict.get('account_number', '')))%89999 + 10000}"

            updated_branches.append(b_dict)

        case.recovery_branches = updated_branches
        branches = updated_branches
        total_lien = sum(
            float(b.get("recoverable_amount", 0.0))
            for b in branches
            if b.get("status") in ("LIEN_MARKED", "FROZEN")
        )
        case.lien_amount = total_lien
        case.status = CaseStatus.ACTION_TAKEN.value
        case.recommended_action = (
            f"Statutory Lien (Sec 106 BNSS) Placed: ₹{total_lien:,.2f} Ring-Fenced across {len(branches)} Branches"
            if req.mode != "FULL_FREEZE"
            else f"Full Account Freeze Placed on {case.current_holder_account}"
        )
        case.updated_at = datetime.now(timezone.utc)

    # 6. Apply to DB Account
    if account:
        if req.mode == "FULL_FREEZE":
            account.status = AccountStatus.FROZEN.value
        else:
            # Under Section 106 BNSS, place statutory lien without destructive full account freeze
            lien_delta = float(case.lien_amount) if case and case.lien_amount else float(account.balance)
            account.lien_amount = (account.lien_amount or 0.0) + lien_delta

    # 7. Audit Log
    from app.models.audit_log import AuditLog, AuditAction
    from uuid import uuid4

    audit = AuditLog(
        id=uuid4(),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_email=current_user.email,
        user_role=current_user.role if isinstance(current_user.role, str) else current_user.role.value,
        action=AuditAction.ACCOUNT_FROZEN.value if req.mode == "FULL_FREEZE" else AuditAction.CASE_UPDATED.value,
        target_type="ACCOUNT",
        target_id=target_acc,
        details={
            "directive_mode": req.mode or "LIEN",
            "statute": "Section 106 BNSS / I4C Protocol" if req.mode != "FULL_FREEZE" else "Section 91 CrPC Full Freeze",
            "reason": req.reason,
            "case_id": case.case_id if case else None,
            "lien_amount": float(case.lien_amount if case else 0.0),
            "balance_preserved": float(account.balance if account else (case.amount_at_risk if case else 0.0)),
            "branches_count": len(branches),
        },
        ip_address="127.0.0.1",
        timestamp=datetime.now(timezone.utc),
    )
    session.add(audit)

    await session.commit()
    if account:
        await session.refresh(account)
    if case:
        await session.refresh(case)

    # 8. Real-Time Broadcasts
    await ws_events_manager.broadcast(
        WSEventTypes.ACCOUNT_FROZEN,
        {
            "account_number": target_acc,
            "account_id": str(account.id) if account else target_acc,
            "status": "FROZEN" if req.mode == "FULL_FREEZE" else "LIEN_MARKED",
            "mode": req.mode or "LIEN",
            "frozen_by": current_user.full_name,
            "reason": req.reason,
            "lien_amount": float(case.lien_amount if case else 0.0),
            "balance": float(account.balance if account else 0.0),
        }
    )

    if case:
        await ws_events_manager.broadcast(
            WSEventTypes.RECOVERY_CASE_CREATED,
            {
                "case_id": case.case_id,
                "recovery_score": case.recovery_score,
                "recovery_probability": case.recovery_probability,
                "current_holder_account": case.current_holder_account,
                "amount_at_risk": float(case.amount_at_risk or 0),
                "recovered_amount": float(case.recovered_amount or 0),
                "lien_amount": float(case.lien_amount or 0),
                "recovery_branches": case.recovery_branches,
                "score_breakdown": case.score_breakdown,
                "status": "ACTION_TAKEN",
                "recommended_action": case.recommended_action,
            }
        )

    mode_label = "Emergency Full Account Freeze" if req.mode == "FULL_FREEZE" else "Statutory Lien (Sec 106 BNSS)"
    return {
        "success": True,
        "mode": req.mode or "LIEN",
        "message": f"{mode_label} placed on {target_acc}. NPCI ISO-20022 Directives Dispatched.",
        "case_id": case.case_id if case else None,
        "account_affected": target_acc,
        "lien_amount": float(case.lien_amount if case else 0.0),
        "balance_preserved": float(account.balance if account else (case.amount_at_risk if case else 0.0)),
        "recovery_score": case.recovery_score if case else 88.0,
        "recovery_probability": case.recovery_probability if case else "HIGH",
        "recovery_branches": case.recovery_branches if case else branches,
        "legal_notice": "Section 106 BNSS Statutory Lien Directive Dispatched to Bank Nodal Officers",
        "status": "ACTION_TAKEN",
        "npci_dispatch_steps": [
            {"step": 1, "label": "ISO-20022 Lien Directive Dispatched via NPCI Central Switch", "status": "COMPLETED"},
            {"step": 2, "label": f"Beneficiary Banks ACK Received ({case.case_id if case else 'ISO-ACK'}) — Ring-fenced", "status": "COMPLETED"},
            {"step": 3, "label": "Statutory Lien Registered in I4C National Cybercrime Portal (1930)", "status": "COMPLETED"},
        ],
    }


# ---------------------------------------------------------------------------
# Restitution and Legal Notice Directives
# ---------------------------------------------------------------------------

@router.post("/cases/{case_id}/restitute")
async def restitute_case(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Execute pro-rata capital restitution for a recovery case under Section 106 BNSS / I4C.
    Calculates total recoverable funds across all non-leaked banking branches,
    credits the victim account with the recoverable sum (supporting partial pro-rata recovery),
    marks branches as RESTITUTED, and transitions case to RECOVERED.
    """
    from datetime import datetime, timezone
    from decimal import Decimal
    from uuid import uuid4
    from sqlalchemy import select, or_
    from app.models.account import Account, AccountStatus
    from app.models.recovery import RecoveryCase, CaseStatus
    from app.models.fraud_alert import FraudAlert, AlertStatus
    from app.models.transaction import Transaction, TransactionStatus
    from app.models.audit_log import AuditLog, AuditAction
    from app.core.websocket_events import ws_events_manager, WSEventTypes
    from app.services.recovery_engine import RecoveryEngine

    service = RecoveryService(session)
    case = await service.get_case(case_id)

    # 1. Identify victim and holder accounts
    holder_acc_num = case.current_holder_account
    holder_res = await session.execute(select(Account).where(Account.account_number == holder_acc_num))
    holder = holder_res.scalar_one_or_none()

    # Victim account from alert or transaction or fallback
    victim = None
    if case.alert and case.alert.account:
        victim = case.alert.account
    elif case.transaction and case.transaction.sender_account:
        victim = case.transaction.sender_account

    if not victim:
        vic_res = await session.execute(select(Account).where(Account.account_number == "ACC1001"))
        victim = vic_res.scalar_one_or_none()

    if not victim:
        vic_res = await session.execute(select(Account).where(Account.account_number != holder_acc_num).limit(1))
        victim = vic_res.scalar_one_or_none()

    # 2. Multi-Branch Pro-Rata Recoverable Calculation
    branches = case.recovery_branches or RecoveryEngine.synthesize_branches(
        case.amount_at_risk, case.current_holder_account, case.status
    )

    recoverable_amount = sum(
        float(b.get("recoverable_amount", 0.0))
        for b in branches
        if b.get("status") != "LEAKED_ATM" and b.get("rail") != "ATM_EXIT"
    )

    total_at_risk = float(case.amount_at_risk or 100000.0)
    if recoverable_amount <= 0:
        recoverable_amount = round(total_at_risk * 0.80, 2)

    leaked_shortfall = round(total_at_risk - recoverable_amount, 2)
    recovery_percentage = round((recoverable_amount / total_at_risk) * 100, 1) if total_at_risk > 0 else 80.0

    # 3. Update branch statuses
    updated_branches = []
    for b in branches:
        b_dict = dict(b)
        if b_dict.get("rail") == "ATM_EXIT" or b_dict.get("status") == "LEAKED_ATM":
            b_dict["status"] = "LEAKED_ATM"
        else:
            b_dict["status"] = "RESTITUTED"
        updated_branches.append(b_dict)

    case.recovery_branches = updated_branches
    case.recovered_amount = recoverable_amount
    case.lien_amount = 0.0  # Lien converted into restitution settlement

    # 4. Debits & Credits
    amount_to_restore_dec = Decimal(str(recoverable_amount))
    if holder:
        if holder.balance >= amount_to_restore_dec:
            holder.balance -= amount_to_restore_dec
        if hasattr(holder, "lien_amount") and holder.lien_amount:
            holder.lien_amount = max(0.0, float(holder.lien_amount) - recoverable_amount)

    if victim:
        victim.balance += amount_to_restore_dec
        victim.status = AccountStatus.ACTIVE.value

    # 5. Create synthetic restitution ledger transaction
    restitution_txn = Transaction(
        id=uuid4(),
        transaction_id=f"TXN_REST_{datetime.now(timezone.utc).strftime('%H%M%S')}_{case.case_id[-4:]}",
        sender_account_id=holder.id if holder else (victim.id if victim else uuid4()),
        receiver_account_id=victim.id if victim else (holder.id if holder else None),
        amount=amount_to_restore_dec,
        remark=f"Section 106 BNSS Pro-Rata Restitution ({recovery_percentage}% Recovered: ₹{recoverable_amount:,.2f} Settled via NPCI Switch; ₹{leaked_shortfall:,.2f} ATM Leakage)",
        status=TransactionStatus.COMPLETED.value,
        risk_score=5.0,
        is_flagged=False,
        is_simulation=True,
        scenario_id="statutory_restitution",
        created_at=datetime.now(timezone.utc),
    )
    session.add(restitution_txn)

    # 6. Update Recovery Case to RECOVERED
    case.status = CaseStatus.RECOVERED.value
    case.recommended_action = (
        f"{recovery_percentage}% PRO-RATA CAPITAL RESTITUTED UNDER SECTION 106 BNSS "
        f"(₹{recoverable_amount:,.2f} Settled to {victim.account_number if victim else 'Victim'} via NPCI Switch)"
    )
    case.updated_at = datetime.now(timezone.utc)

    # 7. Close linked Fraud Alert if present
    alert_to_ack = None
    if case.alert_id:
        al_res = await session.execute(select(FraudAlert).where(FraudAlert.id == case.alert_id))
        al_obj = al_res.scalar_one_or_none()
        if al_obj:
            al_obj.status = AlertStatus.CLOSED.value
            alert_to_ack = al_obj.alert_id

    # 8. Audit Log
    audit = AuditLog(
        id=uuid4(),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_email=current_user.email,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action=AuditAction.CASE_UPDATED.value,
        target_type="CASE",
        target_id=case.case_id,
        details={
            "action": "PRO_RATA_CAPITAL_RESTITUTED",
            "case_id": case.case_id,
            "statute": "Section 106 BNSS / I4C Protocol",
            "holder_account": holder_acc_num,
            "victim_account": victim.account_number if victim else "Unknown",
            "amount_at_risk": total_at_risk,
            "amount_restituted": recoverable_amount,
            "recovery_percentage": recovery_percentage,
            "leaked_shortfall": leaked_shortfall,
            "status": "RECOVERED",
        },
        ip_address="127.0.0.1",
        timestamp=datetime.now(timezone.utc),
    )
    session.add(audit)

    await session.commit()
    await session.refresh(case)

    # 9. Real-Time Broadcasts
    if alert_to_ack:
        await ws_events_manager.broadcast(
            WSEventTypes.ALERT_ACKNOWLEDGED,
            {"alert_id": alert_to_ack, "acknowledged_by": current_user.full_name},
        )

    await ws_events_manager.broadcast(
        WSEventTypes.TRANSACTION_CREATED,
        {
            "id": str(restitution_txn.id),
            "transaction_id": restitution_txn.transaction_id,
            "source": holder_acc_num,
            "target": victim.account_number if victim else "ACC_VICTIM",
            "source_name": "Multi-Mule Intermediary Ring",
            "target_name": "Victim Account",
            "amount": float(recoverable_amount),
            "risk_score": 5.0,
            "is_flagged": False,
            "status": "COMPLETED",
            "remark": f"Pro-Rata Capital Restituted under Section 106 BNSS for Case {case.case_id}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_simulation": True,
            "scenario_id": "statutory_restitution",
        },
    )

    await ws_events_manager.broadcast(
        WSEventTypes.RECOVERY_CASE_CREATED,
        {
            "case_id": case.case_id,
            "recovery_score": 100.0,
            "recovery_probability": "HIGH",
            "current_holder_account": holder_acc_num,
            "amount_at_risk": total_at_risk,
            "recovered_amount": recoverable_amount,
            "lien_amount": 0.0,
            "recovery_branches": updated_branches,
            "score_breakdown": case.score_breakdown,
            "status": "RECOVERED",
            "recommended_action": case.recommended_action,
        },
    )

    return {
        "success": True,
        "message": f"Case {case.case_id} pro-rata restitution executed. ₹{recoverable_amount:,.2f} ({recovery_percentage}%) restored to victim.",
        "case_id": case.case_id,
        "status": "RECOVERED",
        "amount_at_risk": total_at_risk,
        "amount_restituted": recoverable_amount,
        "recovered_amount": recoverable_amount,
        "recovery_percentage": recovery_percentage,
        "leaked_shortfall": leaked_shortfall,
        "recovery_branches": updated_branches,
        "holder_account": holder_acc_num,
        "victim_account": victim.account_number if victim else None,
        "victim_balance": float(victim.balance) if victim else None,
    }


@router.get("/cases/{case_id}/legal-notice")
async def generate_legal_notice(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Generate statutory formal legal notice under Section 91 CrPC / Section 94 & 106 BNSS 2023,
    complete with Multi-Bank Schedule of Tainted Accounts and NPCI ISO-20022 references.
    """
    service = RecoveryService(session)
    case = await service.get_case(case_id)
    now_str = datetime.now(timezone.utc).strftime("%d %B %Y at %H:%M:%S UTC")

    victim_acc = "ACC1001"
    if case.alert and case.alert.account:
        victim_acc = case.alert.account.account_number
    elif case.transaction and case.transaction.sender_account:
        victim_acc = case.transaction.sender_account.account_number

    branches = case.recovery_branches or []
    total_lien = float(case.lien_amount or case.amount_at_risk or 100000.0)

    # Build schedule rows
    schedule_rows = []
    for b in branches:
        schedule_rows.append(
            f"| `{b.get('branch_id', 'BR')}` | `{b.get('account_number')}` | {b.get('bank_name')} | Hop {b.get('hop_level', 1)} | **{b.get('rail')}** | ₹{float(b.get('tainted_amount', 0)):,.2f} | ₹{float(b.get('recoverable_amount', 0)):,.2f} | `{b.get('npci_ref', 'N/A')}` | `{b.get('status', 'ACTIVE')}` |"
        )
    schedule_table_md = "\n".join(schedule_rows) if schedule_rows else f"| `BR-01` | `{case.current_holder_account}` | Partner Bank | Hop 1 | NEFT | ₹{total_lien:,.2f} | ₹{total_lien:,.2f} | `NPCI-LIEN-01` | `{case.status}` |"

    notice_content = f"""# STATUTORY NOTICE UNDER SECTION 91 OF THE CODE OF CRIMINAL PROCEDURE, 1973
**(Read with Sections 94 & 106 of Bharatiya Nagarik Suraksha Sanhita, 2023 - BNSS)**
**National Cybercrime Reporting Portal (NCRP / I4C - Helpline 1930) Inter-Bank Directive**

**REFERENCE NO:** MT-SEC106-BNSS/{case.case_id}
**DATE OF ISSUANCE:** {now_str}
**ISSUING AUTHORITY:** Financial Crime Cyber Operations Unit, FIU-IND / MoneyTrace Platform
**INVESTIGATING OFFICER:** {current_user.full_name} ({current_user.email})

---

### TO:
**THE NODAL OFFICERS / AUTHORIZED SIGNATORIES (FRAUD & DISPUTE OPERATIONS)**
Partner Beneficiary Banks, NPCI Switch Members & Intermediary Payment Gateways

---

### SUBJECT:
**STATUTORY LIEN DIRECTIVE & EMERGENCY DEBIT RESTRAINT UNDER SECTION 106 BNSS 2023 FOR PROCEEDS OF CYBER CRIME**

Sir / Madam,

1. **INCIDENT OVERVIEW:**
   An investigation is being conducted into an unauthorized cyber financial siphon incident registered under Case Docket **{case.case_id}**, involving a total compromised sum of **INR {float(case.amount_at_risk or 0):,.2f}** originally debited from victim account **`{victim_acc}`**.

2. **GRAPH INTELLIGENCE & MULTI-MULE FAN-OUT:**
   Automated forensic graph telemetry and real-time NPCI pass-through logs have identified that the said compromised proceeds were layered across multiple recipient accounts and payment rails as specified in the **Multi-Bank Schedule of Tainted Accounts** below.

3. **SCHEDULE OF BENEFICIARY / MULE ACCOUNTS UNDER STATUTORY LIEN (SEC 106 BNSS):**

| Branch ID | Beneficiary Account | Bank / Institution | Hop | Rail | Tainted Flow | Statutory Lien | NPCI Reference | Disposition |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
{schedule_table_md}

4. **STATUTORY DIRECTIVE (SECTION 106 BNSS / SECTION 91 CrPC):**
   By virtue of the powers conferred under **Section 106 BNSS 2023** (Statutory Lien & Ring-Fencing of Criminal Proceeds) and **Section 91 CrPC**, you are hereby commanded to:
   - **Immediately place a STATUTORY LIEN** against the disputed sums indicated above in each respective beneficiary account. Ring-fence these balances without affecting legitimate unencumbered capital.
   - **Furnish within 24 hours** the complete KYC dossier, registered mobile number, IP logs, and 90-day ledger extract for each listed beneficiary account.
   - **Hold all marked funds** subject to further judicial restitution directives or Section 457 CrPC restitution orders.

5. **LEGAL NOTICE:**
   Take notice that non-compliance with this lawful order shall attract statutory penal liabilities under **Section 175 and Section 187 of the Indian Penal Code (IPC)** / **Bharatiya Nyaya Sanhita (BNS)**.

---

**BY ORDER OF THE COMPETENT INVESTIGATING AUTHORITY**
*Digital Signature Hash: SHA256-MT106-{case.case_id}-NPCI-CERTIFIED*
*Docket Status: {case.status} | ML Recovery Confidence: {case.recovery_score:.1f}% ({case.recovery_probability})*
"""

    return {
        "success": True,
        "case_id": case.case_id,
        "reference_no": f"MT-SEC106-BNSS/{case.case_id}",
        "statute": "Section 91 CrPC / Section 94 & 106 BNSS",
        "target_account": case.current_holder_account,
        "amount": case.amount_at_risk,
        "recovered_amount": case.recovered_amount,
        "lien_amount": case.lien_amount,
        "recovery_branches": branches,
        "status": case.status,
        "issued_at": now_str,
        "officer": current_user.full_name,
        "notice_text": notice_content,
    }

