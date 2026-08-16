"""Transaction endpoints — Phase 4 Banking Simulator."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from decimal import Decimal

from app.core import exceptions
from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User
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
# Send Money
# ---------------------------------------------------------------------------

@router.post("/send", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def send_money(
    data: SendTransactionRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> TransactionResponse:
    """Send money to another account."""
    service = TransactionService(session)
    transaction = await service.send_money(
        sender_user_id=current_user.id,
        receiver_account_number=data.receiver_account_number,
        amount=data.amount,
        remark=data.remark,
        device_info=data.device_info,
        ip_address=data.ip_address,
        location=data.location,
    )
    return TransactionResponse.model_validate(transaction)


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

    total_pages = (total + page_size - 1) // page_size
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

    # Build simplified response with account numbers
    response = []
    for t in transactions:
        # Note: sender_account and receiver_account are loaded via selectinload
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