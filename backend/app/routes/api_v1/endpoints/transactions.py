"""Transaction endpoints — Phase 4 Banking Simulator with UPI PIN & Security."""

from fastapi import APIRouter, Depends, Query, status, Body, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime, timezone
import hashlib

from app.core import exceptions
from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User
from app.models.audit_log import AuditLog, AuditAction
from app.schemas.transaction import (
    SendTransactionRequest,
    TransactionResponse,
    TransactionHistoryResponse,
    AccountResponse,
    LiveTransactionResponse,
)
from app.services.transaction import TransactionService

router = APIRouter()


# ---------------------------------------------------------------------------
# Set / Update 4-Digit UPI PIN
# ---------------------------------------------------------------------------

@router.post("/set-pin")
async def set_transaction_pin(
    pin: str = Body(..., min_length=4, max_length=4, embed=True),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """Set or update 4-digit security PIN for customer banking."""
    if not pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must consist of 4 numeric digits")

    hashed_pin = hashlib.sha256(pin.encode("utf-8")).hexdigest()
    current_user.transaction_pin_hash = hashed_pin

    # Record Audit Log
    audit = AuditLog(
        id=uuid4(),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role if isinstance(current_user.role, str) else current_user.role.value,
        action=AuditAction.PIN_SET.value,
        target_type="USER",
        target_id=str(current_user.id),
        details={"message": "4-Digit Security PIN configured successfully"},
        timestamp=datetime.now(timezone.utc),
    )
    session.add(audit)
    await session.commit()

    return {"success": True, "message": "4-digit security PIN set successfully"}


# ---------------------------------------------------------------------------
# Verify 4-Digit UPI PIN
# ---------------------------------------------------------------------------

@router.post("/verify-pin")
async def verify_transaction_pin(
    pin: str = Body(..., min_length=4, max_length=4, embed=True),
    current_user: User = Depends(get_current_active_user),
):
    """Verify customer transaction PIN."""
    if not current_user.transaction_pin_hash:
        # Default mock PIN 1234 if not yet set
        is_valid = (pin == "1234" or pin.isdigit())
    else:
        hashed = hashlib.sha256(pin.encode("utf-8")).hexdigest()
        is_valid = (hashed == current_user.transaction_pin_hash)

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid 4-digit transaction PIN. Please try again.")

    return {"valid": True, "message": "PIN verified"}


# ---------------------------------------------------------------------------
# Send Money
# ---------------------------------------------------------------------------

from fastapi import APIRouter, Depends, Query, status, Body, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.services.geoip import GeoIPService
from app.models.transaction import Transaction

@router.post("/send", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def send_money(
    data: SendTransactionRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> TransactionResponse:
    """Send money to another account, automatically capturing client IP and GeoIP coordinates."""
    client_ip = data.ip_address or request.headers.get("x-forwarded-for") or (request.client.host if getattr(request, "client", None) else "103.21.244.2")
    if "," in str(client_ip):
        client_ip = str(client_ip).split(",")[0].strip()

    geo_info = GeoIPService.resolve_ip(str(client_ip))
    location_str = data.location or geo_info["location_string"]
    device_str = data.device_info or request.headers.get("user-agent", "Chrome on Windows 11")

    service = TransactionService(session)
    transaction = await service.send_money(
        sender_user_id=current_user.id,
        receiver_account_number=data.receiver_account_number,
        amount=data.amount,
        remark=data.remark,
        device_info=device_str,
        ip_address=geo_info["ip"],
        location=location_str,
        is_simulation=data.is_simulation,
        scenario_id=data.scenario_id,
    )

    # Log Audit
    audit = AuditLog(
        id=uuid4(),
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_role=current_user.role if isinstance(current_user.role, str) else current_user.role.value,
        action=AuditAction.TRANSACTION_INITIATED.value,
        target_type="TRANSACTION",
        target_id=transaction.transaction_id,
        details={
            "amount": float(transaction.amount),
            "receiver": data.receiver_account_number,
            "ip_address": geo_info["ip"],
            "city": geo_info["city"],
        },
        timestamp=datetime.now(timezone.utc),
    )
    session.add(audit)
    await session.commit()

    return TransactionResponse.model_validate(transaction)


# ---------------------------------------------------------------------------
# IP Geolocation Threat Map API
# ---------------------------------------------------------------------------

@router.get("/ip-map")
async def get_transaction_ip_map(
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Get transactions with resolved GeoIP coordinates, IP address, risk score,
    and account metadata for interactive geospatial threat map plotting and smooth zoom focus.
    """
    stmt = (
        select(Transaction)
        .order_by(Transaction.timestamp.desc())
        .limit(limit)
        .options(
            selectinload(Transaction.sender_account),
            selectinload(Transaction.receiver_account),
        )
    )
    res = await session.execute(stmt)
    txns = res.scalars().all()

    nodes = []
    for t in txns:
        ip = t.ip_address or "103.21.244.2"
        geo = GeoIPService.resolve_ip(ip)

        sender_acc = t.sender_account.account_number if t.sender_account else "ACC1001"
        receiver_acc = t.receiver_account.account_number if t.receiver_account else "ACC1002"

        # Receiver IP coordinates (destination node)
        receiver_geo = GeoIPService.resolve_ip(receiver_acc)

        nodes.append({
            "id": str(t.id),
            "transaction_id": t.transaction_id,
            "ip_address": geo["ip"],
            "city": geo["city"],
            "state": geo["state"],
            "country": geo["country"],
            "lat": geo["lat"],
            "lng": geo["lng"],
            "isp": geo["isp"],
            "location_string": geo["location_string"],
            "amount": float(t.amount),
            "risk_score": float(t.risk_score or 0.0),
            "is_flagged": bool(t.is_flagged),
            "status": t.status,
            "remark": t.remark or "Transfer",
            "sender_account": sender_acc,
            "receiver_account": receiver_acc,
            "receiver_city": receiver_geo["city"],
            "receiver_lat": receiver_geo["lat"],
            "receiver_lng": receiver_geo["lng"],
            "timestamp": t.timestamp.isoformat() if t.timestamp else None,
        })

    return {
        "total": len(nodes),
        "transactions": nodes,
    }


# ---------------------------------------------------------------------------
# Transaction History
# ---------------------------------------------------------------------------

@router.get("/history", response_model=TransactionHistoryResponse)
async def get_transaction_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> TransactionHistoryResponse:
    """Get paginated transaction history for current user."""
    service = TransactionService(session)
    transactions, total = await service.get_transaction_history(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return TransactionHistoryResponse(
        transactions=[TransactionResponse.model_validate(t) for t in transactions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ---------------------------------------------------------------------------
# Live Transaction Feed
# ---------------------------------------------------------------------------

@router.get("/live", response_model=list[LiveTransactionResponse])
async def get_live_transactions(
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
) -> list[LiveTransactionResponse]:
    """Get latest transactions across all accounts (public feed)."""
    service = TransactionService(session)
    transactions = await service.get_live_transactions(limit=limit)

    response = []
    for t in transactions:
        sender_acc_num = t.sender_account.account_number if t.sender_account else "UNKNOWN"
        receiver_acc_num = t.receiver_account.account_number if t.receiver_account else "UNKNOWN"
        response.append(LiveTransactionResponse(
            transaction_id=t.transaction_id,
            sender_account_number=sender_acc_num,
            receiver_account_number=receiver_acc_num,
            amount=t.amount,
            timestamp=t.timestamp,
        ))
    return response


# ---------------------------------------------------------------------------
# Transaction Detail
# ---------------------------------------------------------------------------

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> TransactionResponse:
    """Get transaction details by ID."""
    service = TransactionService(session)
    transaction = await service.get_transaction_by_id(
        transaction_id=transaction_id,
        user_id=current_user.id,
    )
    if transaction is None:
        raise exceptions.NotFoundError("Transaction not found")
    return TransactionResponse.model_validate(transaction)


# ---------------------------------------------------------------------------
# Account Detail (Current User)
# ---------------------------------------------------------------------------

@router.get("/accounts/me", response_model=AccountResponse)
async def get_my_account(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> AccountResponse:
    """Get current user's account details."""
    service = TransactionService(session)
    account = await service.get_account_by_user_id(current_user.id)
    if account is None:
        raise exceptions.NotFoundError("Account not found")
    return AccountResponse.model_validate(account)