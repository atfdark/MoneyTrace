"""Simulation and Demo Trigger Endpoints for Live Presentations."""

import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import uuid4
import random

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import exceptions
from app.core.deps import get_current_active_user
from app.core.websocket_events import ws_events_manager, WSEventTypes
from app.database import get_session
from app.models.account import Account, AccountStatus
from app.models.fraud_alert import FraudAlert, Severity, AlertStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User
from app.services.transaction import TransactionService
from app.services.fraud_service import FraudService

router = APIRouter()


@router.post("/transaction")
async def trigger_simulation_transaction(
    scenario: str = Query("high_risk", description="Scenario type: normal, high_risk, velocity, drain"),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Trigger an instant realistic transaction between demo users to showcase
    live feed ticker, audio siren, toast popups, and graph animations.
    """
    # Fetch demo accounts
    stmt = select(Account).join(User, Account.user_id == User.id).where(Account.status == AccountStatus.ACTIVE.value).limit(10)
    res = await session.execute(stmt)
    accounts = list(res.scalars().all())

    if len(accounts) < 2:
        raise exceptions.ValidationError("Need at least 2 active accounts in database to simulate.")

    sender = accounts[0]
    receiver = accounts[1]

    if scenario == "high_risk":
        amount = Decimal("85000.00")
        remark = "Urgent high-value clearing transfer"
    elif scenario == "velocity":
        amount = Decimal("65000.00")
        remark = "Automated high-velocity routing"
    elif scenario == "drain":
        amount = Decimal("95000.00")
        remark = "Complete balance liquidation"
    else:
        amount = Decimal("2500.00")
        remark = "Lunch payment"

    txn_service = TransactionService(session)
    txn = await txn_service.send_money(
        sender_user_id=sender.user_id,
        receiver_account_number=receiver.account_number,
        amount=amount,
        remark=remark,
        device_info="Demo Simulator Client v10.5",
        ip_address="192.168.1.100",
        location="Mumbai, IN",
    )

    return {
        "success": True,
        "scenario": scenario,
        "transaction_id": txn.transaction_id,
        "sender": sender.account_number,
        "receiver": receiver.account_number,
        "amount": float(txn.amount),
        "risk_score": float(txn.risk_score or 0),
        "is_flagged": txn.is_flagged,
    }


@router.post("/mule-chain")
async def trigger_simulation_mule_chain(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Trigger a 3-hop layered mule chain: ACC1001 -> ACC1002 -> ACC1003 -> ACC1004."""
    # Find or use accounts ACC1001, ACC1002, ACC1003, ACC1004
    stmt = select(Account).limit(4)
    res = await session.execute(stmt)
    accs = list(res.scalars().all())

    if len(accs) < 4:
        raise exceptions.ValidationError("Need at least 4 accounts for mule chain simulation.")

    txn_service = TransactionService(session)
    hops = []

    amounts = [Decimal("100000.00"), Decimal("95000.00"), Decimal("90000.00")]
    for i in range(3):
        snd = accs[i]
        rcv = accs[i + 1]
        t = await txn_service.send_money(
            sender_user_id=snd.user_id,
            receiver_account_number=rcv.account_number,
            amount=amounts[i],
            remark=f"Layering Hop #{i+1} fund dispersion",
            device_info="Mule Router Agent",
            ip_address=f"10.0.0.{i+10}",
            location="Cyber Routing Node",
        )
        hops.append({
            "hop": i + 1,
            "txn_id": t.transaction_id,
            "from": snd.account_number,
            "to": rcv.account_number,
            "amount": float(amounts[i]),
        })

    return {
        "success": True,
        "message": "3-hop mule chain simulation executed successfully.",
        "hops": hops,
    }


@router.post("/alert")
async def trigger_critical_alert(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Trigger an instant Critical Alert to test the red siren and emergency overlay."""
    alert_id = f"ALT_DEMO_{datetime.now(timezone.utc).strftime('%H%M%S')}"
    
    payload = {
        "alert_id": alert_id,
        "alert_type": "Large Transaction, Velocity Attack, Mule Forwarding",
        "risk_score": 92.0,
        "severity": "CRITICAL",
        "description": "CRITICAL ANOMALY: Rapid ₹85,000.00 transfer from dormant node forwarded to suspected mule ring.",
        "account_id": "ACC1001",
        "transaction_id": f"TXN_DEMO_{random.randint(100000, 999999)}",
        "transaction_code": f"TXN_DEMO_{random.randint(100000, 999999)}",
        "amount": 85000.0,
        "rule_breakdown": {
            "rules_triggered": ["Large Transaction", "Velocity Attack", "Mule Forwarding"],
            "score_breakdown": {"Large Transaction": 45.0, "Velocity Attack": 25.0, "Mule Forwarding": 22.0},
        },
        "status": "OPEN",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_summary": {
            "alert_id": alert_id,
            "transaction_id": f"TXN_DEMO_{random.randint(100000, 999999)}",
            "amount": 85000.0,
            "risk_score": 92.0,
            "severity": "CRITICAL",
            "triggered_rules": ["Large Transaction", "Velocity Attack", "Mule Forwarding"],
            "summary_text": "CRITICAL ANOMALY: Transfer of ₹85,000.00 triggered Large Transaction, Velocity Attack, and Mule Forwarding. Suspected money laundering funnel in progress.",
            "recommended_action": "Freeze Account & Issue Section 91 CrPC Notice",
            "recovery_score": 85.0,
            "recovery_probability": "HIGH",
        },
    }

    await ws_events_manager.broadcast(WSEventTypes.FRAUD_ALERT_CREATED, payload)
    return {"success": True, "alert": payload}


# ===========================================================================
# 2-PHASE / 2-STEP ATTACK & RECOVERY SIMULATION
# ===========================================================================

from app.models.recovery import RecoveryCase, CaseStatus, RecoveryProbability
from app.models.audit_log import AuditLog, AuditAction


async def _resolve_simulation_accounts(session: AsyncSession):
    """Ensure victim ACC1001 and 3 mule accounts (ACC1002, ACC1003, ACC1004) exist and are usable."""
    stmt = select(Account).where(
        Account.account_number.in_(["ACC1001", "ACC1002", "ACC1003", "ACC1004"])
    )
    res = await session.execute(stmt)
    acc_map = {a.account_number: a for a in res.scalars().all()}

    # If any are missing, fallback to first 4 accounts
    if len(acc_map) < 4:
        all_res = await session.execute(select(Account).limit(4))
        all_accs = list(all_res.scalars().all())
        if len(all_accs) < 4:
            raise exceptions.ValidationError("Need at least 4 bank accounts in database to simulate.")
        victim = all_accs[0]
        mules = all_accs[1:4]
    else:
        victim = acc_map["ACC1001"]
        mules = [acc_map["ACC1002"], acc_map["ACC1003"], acc_map["ACC1004"]]

    return victim, mules


@router.post("/two-phase/drain")
async def trigger_two_phase_drain(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Step 1 (Attack Phase): Deducts ₹150,000 from victim's account, splits/layers
    funds across 3 mule accounts, broadcasts live transactions and critical fraud alert,
    and sounds the red SOC siren on workstation.
    """
    victim, mules = await _resolve_simulation_accounts(session)

    # Ensure victim has adequate funds
    if victim.balance < Decimal("150000.00"):
        victim.balance = Decimal("350000.00")
    victim.status = AccountStatus.ACTIVE.value

    # Ensure mules are active
    for m in mules:
        m.status = AccountStatus.ACTIVE.value

    split_amounts = [Decimal("60000.00"), Decimal("50000.00"), Decimal("40000.00")]
    split_labels = [
        "Hop 1: Rapid P2P Siphon Layer",
        "Hop 2: High-Velocity Aggregation Layer",
        "Hop 3: Terminal Cashout Mule Node",
    ]
    risk_scores = [88.0, 92.0, 96.0]

    now_utc = datetime.now(timezone.utc)
    now_ts = now_utc.strftime("%H%M%S")
    rnd_suffix = random.randint(100, 999)

    created_txns = []
    # Deduct victim
    victim.balance -= Decimal("150000.00")

    for i in range(3):
        mule = mules[i]
        mule.balance += split_amounts[i]

        txn = Transaction(
            id=uuid4(),
            transaction_id=f"TXN_DRN_{now_ts}_{i+1}_{rnd_suffix}",
            sender_account_id=victim.id,
            receiver_account_id=mule.id,
            amount=split_amounts[i],
            remark=split_labels[i],
            status=TransactionStatus.COMPLETED.value,
            risk_score=risk_scores[i],
            is_flagged=True,
            is_simulation=True,
            scenario_id="two_phase_attack",
            created_at=now_utc,
        )
        session.add(txn)
        created_txns.append(txn)

    # Critical Fraud Alert
    alert_id = f"ALT_DRN_{now_ts}_{rnd_suffix}"
    terminal_mule = mules[2]
    alert = FraudAlert(
        id=uuid4(),
        alert_id=alert_id,
        transaction_id=created_txns[2].id,
        account_id=victim.id,
        alert_type="Rapid Outflow Drain, Multi-Mule Layering, Pass-Through Funnel",
        risk_score=96.0,
        severity=Severity.CRITICAL.value,
        description=f"CRITICAL SIPHON ATTACK: ₹1,50,000.00 drained from victim {victim.account_number} and split into 3 mule accounts ({mules[0].account_number}, {mules[1].account_number}, {mules[2].account_number}). Terminal dissipation at {terminal_mule.account_number}.",
        rule_breakdown={
            "rules_triggered": ["Rapid Balance Liquidation", "Multi-Mule Fan-Out", "High-Velocity Layering"],
            "score_breakdown": {
                "Rapid Balance Liquidation": 45.0,
                "Multi-Mule Fan-Out": 32.0,
                "High-Velocity Layering": 19.0,
            },
        },
        status=AlertStatus.OPEN.value,
        created_at=now_utc,
    )
    session.add(alert)

    # Recovery Case
    case_id = f"REC{now_utc.strftime('%Y%m%d')}{random.randint(1000, 9999)}"
    recovery_case = RecoveryCase(
        id=uuid4(),
        case_id=case_id,
        alert_id=alert.id,
        transaction_id=created_txns[2].id,
        recovery_score=94.0,
        recovery_probability=RecoveryProbability.HIGH.value,
        current_holder_account=terminal_mule.account_number,
        amount_at_risk=150000.0,
        recommended_action=f"Execute Emergency Section 91 CrPC Freeze on {mules[0].account_number}, {mules[1].account_number}, {mules[2].account_number} and Restitute ₹1,50,000 to Victim {victim.account_number}",
        status=CaseStatus.OPEN.value,
        created_at=now_utc,
        updated_at=now_utc,
    )
    session.add(recovery_case)

    # Audit Log
    audit = AuditLog(
        id=uuid4(),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_email=current_user.email,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action=AuditAction.TRANSACTION_INITIATED.value,
        target_type="ACCOUNT",
        target_id=victim.account_number,
        details={
            "scenario": "two_phase_drain",
            "amount_drained": 150000.0,
            "case_id": case_id,
            "alert_id": alert_id,
            "mules": [m.account_number for m in mules],
        },
        ip_address="127.0.0.1",
        timestamp=now_utc,
    )
    session.add(audit)

    await session.commit()

    # 1. Broadcast individual transactions to feed, ticker, and graphs
    for i, txn in enumerate(created_txns):
        await ws_events_manager.broadcast(
            WSEventTypes.TRANSACTION_CREATED,
            {
                "id": str(txn.id),
                "transaction_id": txn.transaction_id,
                "source": victim.account_number,
                "target": mules[i].account_number,
                "source_name": "Victim Account",
                "target_name": f"Mule Node #{i+1}",
                "amount": float(txn.amount),
                "risk_score": float(txn.risk_score),
                "is_flagged": True,
                "status": "COMPLETED",
                "remark": txn.remark,
                "timestamp": now_utc.isoformat(),
                "is_simulation": True,
                "scenario_id": "two_phase_attack",
            },
        )

    # 2. Broadcast Critical Fraud Alert to activate workstation siren
    alert_payload = {
        "alert_id": alert.alert_id,
        "alert_type": alert.alert_type,
        "risk_score": alert.risk_score,
        "severity": alert.severity,
        "description": alert.description,
        "account_id": victim.account_number,
        "account_number": victim.account_number,
        "current_holder": terminal_mule.account_number,
        "target_account": terminal_mule.account_number,
        "case_id": case_id,
        "transaction_id": created_txns[2].transaction_id,
        "amount": 150000.0,
        "recovery_score": 94.0,
        "recovery_probability": "HIGH",
        "rule_breakdown": alert.rule_breakdown,
        "status": "OPEN",
        "created_at": now_utc.isoformat(),
        "is_simulation": True,
        "scenario_id": "two_phase_attack",
        "ai_summary": {
            "alert_id": alert.alert_id,
            "transaction_id": created_txns[2].transaction_id,
            "amount": 150000.0,
            "risk_score": 96.0,
            "severity": "CRITICAL",
            "triggered_rules": ["Multi-Mule Fan-Out", "Rapid Liquidation", "Velocity Attack"],
            "summary_text": f"CRITICAL INCIDENT: Victim {victim.account_number} drained of ₹1,50,000.00 across 3 mule nodes. Terminal holding node: {terminal_mule.account_number}.",
            "recommended_action": "Freeze Mule Accounts & Issue Section 91 CrPC Directive",
            "recovery_score": 94.0,
            "recovery_probability": "HIGH",
        },
    }
    await ws_events_manager.broadcast(WSEventTypes.FRAUD_ALERT_CREATED, alert_payload)

    # 3. Broadcast Recovery Case
    await ws_events_manager.broadcast(
        WSEventTypes.RECOVERY_CASE_CREATED,
        {
            "case_id": case_id,
            "recovery_score": 94.0,
            "recovery_probability": "HIGH",
            "current_holder_account": terminal_mule.account_number,
            "amount_at_risk": 150000.0,
            "balance_preserved": 0.0,
            "status": "OPEN",
            "recommended_action": recovery_case.recommended_action,
        },
    )

    return {
        "success": True,
        "phase": "DRAIN",
        "message": f"Phase 1 Attack Executed: ₹1,50,000 drained from {victim.account_number} into 3 mule accounts.",
        "case_id": case_id,
        "alert_id": alert_id,
        "victim_account": victim.account_number,
        "victim_balance": float(victim.balance),
        "mule_accounts": [m.account_number for m in mules],
        "total_stolen": 150000.0,
        "splits": [
            {"to": mules[0].account_number, "amount": 60000.0, "role": "Mule Hop 1"},
            {"to": mules[1].account_number, "amount": 50000.0, "role": "Mule Hop 2"},
            {"to": mules[2].account_number, "amount": 40000.0, "role": "Terminal Mule Hop 3"},
        ],
    }


@router.post("/two-phase/recover")
async def trigger_two_phase_recover(
    case_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Step 2 (Recovery Phase - "We Have Recovered!"):
    1. Issues emergency Section 91 CrPC freeze on all 3 mule accounts.
    2. Reclaims stolen funds and restitutes ₹150,000 back to victim account.
    3. Silences workstation sirens and updates RecoveryCase to RECOVERED.
    """
    victim, mules = await _resolve_simulation_accounts(session)

    # Find the matching recovery case
    recovery_case = None
    if case_id:
        res = await session.execute(select(RecoveryCase).where(RecoveryCase.case_id == case_id))
        recovery_case = res.scalar_one_or_none()

    if not recovery_case:
        # Pick latest open case or latest case
        res = await session.execute(
            select(RecoveryCase).order_by(RecoveryCase.created_at.desc()).limit(1)
        )
        recovery_case = res.scalar_one_or_none()

    now_utc = datetime.now(timezone.utc)
    now_ts = now_utc.strftime("%H%M%S")

    # 1. Freeze all mule accounts
    for m in mules:
        m.status = AccountStatus.FROZEN.value
        m.updated_at = now_utc

    # 2. Debit mules and credit victim
    split_amounts = [Decimal("60000.00"), Decimal("50000.00"), Decimal("40000.00")]
    for i in range(3):
        if mules[i].balance >= split_amounts[i]:
            mules[i].balance -= split_amounts[i]

    victim.balance += Decimal("150000.00")
    victim.status = AccountStatus.ACTIVE.value
    victim.updated_at = now_utc

    # 3. Create Restitution Transaction
    restitution_txn = Transaction(
        id=uuid4(),
        transaction_id=f"TXN_RESTITUTE_{now_ts}_{random.randint(100, 999)}",
        sender_account_id=mules[2].id,
        receiver_account_id=victim.id,
        amount=Decimal("150000.00"),
        remark="Section 91 CrPC Statutory Capital Restitution Order",
        status=TransactionStatus.COMPLETED.value,
        risk_score=5.0,
        is_flagged=False,
        is_simulation=True,
        scenario_id="two_phase_recovery",
        created_at=now_utc,
    )
    session.add(restitution_txn)

    # 4. Update RecoveryCase to RECOVERED
    alert_to_silence = None
    if recovery_case:
        recovery_case.status = CaseStatus.RECOVERED.value
        recovery_case.recommended_action = "100% CAPITAL INTERCEPTED & RESTITUTED UNDER SECTION 91 CrPC (All 3 Mule Accounts Frozen)"
        recovery_case.updated_at = now_utc

        # Close associated alert
        if recovery_case.alert_id:
            alert_res = await session.execute(
                select(FraudAlert).where(FraudAlert.id == recovery_case.alert_id)
            )
            alert_obj = alert_res.scalar_one_or_none()
            if alert_obj:
                alert_obj.status = AlertStatus.CLOSED.value
                alert_to_silence = alert_obj.alert_id

    # If no alert found from case, pick latest open alert
    if not alert_to_silence:
        latest_alert_res = await session.execute(
            select(FraudAlert).order_by(FraudAlert.created_at.desc()).limit(1)
        )
        l_alert = latest_alert_res.scalar_one_or_none()
        if l_alert:
            l_alert.status = AlertStatus.CLOSED.value
            alert_to_silence = l_alert.alert_id

    # 5. Audit Log
    audit = AuditLog(
        id=uuid4(),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_email=current_user.email,
        user_role=str(current_user.role.value if hasattr(current_user.role, 'value') else current_user.role),
        action=AuditAction.ACCOUNT_FROZEN.value,
        target_type="ACCOUNT",
        target_id=victim.account_number,
        details={
            "action": "FULL_ASSET_RECOVERY_SUCCESSFUL",
            "case_id": recovery_case.case_id if recovery_case else None,
            "amount_restituted": 150000.0,
            "victim_account": victim.account_number,
            "mules_frozen": [m.account_number for m in mules],
            "statutory_act": "Section 91 CrPC / Section 94 BNSS",
        },
        ip_address="127.0.0.1",
        timestamp=now_utc,
    )
    session.add(audit)

    await session.commit()

    # 6. Broadcast Real-Time Events
    # Silences sirens on all connected workstation screens
    if alert_to_silence:
        await ws_events_manager.broadcast(
            WSEventTypes.ALERT_ACKNOWLEDGED,
            {"alert_id": alert_to_silence, "acknowledged_by": current_user.full_name},
        )

    # Freeze notices for each mule
    for m in mules:
        await ws_events_manager.broadcast(
            WSEventTypes.ACCOUNT_FROZEN,
            {
                "account_number": m.account_number,
                "account_id": str(m.id),
                "status": "FROZEN",
                "frozen_by": "Section 91 CrPC Recovery Directive",
                "reason": "Mule syndicate node intercepted in asset recovery operation",
                "balance": float(m.balance),
            },
        )

    # Restitution transaction
    await ws_events_manager.broadcast(
        WSEventTypes.TRANSACTION_CREATED,
        {
            "id": str(restitution_txn.id),
            "transaction_id": restitution_txn.transaction_id,
            "source": mules[2].account_number,
            "target": victim.account_number,
            "source_name": "Intercepted Holding Node",
            "target_name": f"Victim ({victim.account_number})",
            "amount": 150000.0,
            "risk_score": 5.0,
            "is_flagged": False,
            "status": "COMPLETED",
            "remark": "Section 91 CrPC Capital Restitution — Funds Restored",
            "timestamp": now_utc.isoformat(),
            "is_simulation": True,
            "scenario_id": "two_phase_recovery",
        },
    )

    # Recovery completion event
    await ws_events_manager.broadcast(
        WSEventTypes.RECOVERY_CASE_CREATED,
        {
            "case_id": recovery_case.case_id if recovery_case else "REC_RESOLVED",
            "recovery_score": 100.0,
            "recovery_probability": "HIGH",
            "current_holder_account": mules[2].account_number,
            "amount_at_risk": 150000.0,
            "balance_preserved": 150000.0,
            "status": "RECOVERED",
            "recommended_action": "100% CAPITAL RESTITUTED TO VICTIM UNDER SECTION 91 CrPC",
        },
    )

    return {
        "success": True,
        "phase": "RECOVERED",
        "headline": "WE HAVE RECOVERED: 100% of Assets Successfully Restituted!",
        "message": f"All 3 mule accounts ({mules[0].account_number}, {mules[1].account_number}, {mules[2].account_number}) frozen under Section 91 CrPC. ₹1,50,000.00 restored to victim {victim.account_number}.",
        "case_id": recovery_case.case_id if recovery_case else None,
        "alert_id": alert_to_silence,
        "victim_account": victim.account_number,
        "victim_new_balance": float(victim.balance),
        "amount_recovered": 150000.0,
        "mules_frozen": [m.account_number for m in mules],
        "status": "RECOVERED",
    }


@router.post("/two-phase/full-lifecycle")
async def trigger_two_phase_full_lifecycle(
    delay_seconds: float = Query(3.5, ge=1.0, le=15.0),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    1-Click Complete E2E Lifecycle:
    Step 1: Drain victim ₹150,000 across 3 mules + activate siren + generate recovery case.
    Automatic Delay: Wait 3.5s for presentation demonstration.
    Step 2: Emergency freeze mules, restitute ₹150,000 back to victim, silence sirens, mark RECOVERED.
    """
    drain_result = await trigger_two_phase_drain(session=session, current_user=current_user)

    # Wait for the live incident to register on workstation screen
    await asyncio.sleep(delay_seconds)

    recover_result = await trigger_two_phase_recover(
        case_id=drain_result.get("case_id"),
        session=session,
        current_user=current_user,
    )

    return {
        "success": True,
        "mode": "1_CLICK_FULL_LIFECYCLE",
        "phase_1_drain": drain_result,
        "delay_applied_seconds": delay_seconds,
        "phase_2_recovery": recover_result,
        "summary": "1-Click Incident Lifecycle completed: Victim funds drained into mules, intercepted, and 100% restituted.",
    }
