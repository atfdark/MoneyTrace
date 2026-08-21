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
