"""Transaction service — Phase 4 Banking Simulator."""

from datetime import datetime, timezone
from uuid import UUID, uuid4
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import exceptions
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.account import Account, AccountStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.user import User, UserRole
from app.schemas.transaction import SendTransactionRequest


class TransactionService:
    """Business logic for banking transactions."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ------------------------------------------------------------------
    # Account Management
    # ------------------------------------------------------------------

    async def create_account_for_user(self, user_id: UUID) -> Account:
        """Create a new account for a user with default balance."""
        # Generate unique account number
        account_number = await self._generate_unique_account_number()

        account = Account(
            id=uuid4(),
            account_number=account_number,
            user_id=user_id,
            balance=Decimal("100000.00"),
            status=AccountStatus.ACTIVE.value,
        )
        self.session.add(account)
        await self.session.commit()
        await self.session.refresh(account)
        return account

    async def get_account_by_user_id(self, user_id: UUID) -> Account | None:
        """Get the user's account."""
        result = await self.session.execute(
            select(Account).where(Account.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_account_by_number(self, account_number: str) -> Account | None:
        """Get account by account number."""
        result = await self.session.execute(
            select(Account).where(Account.account_number == account_number)
        )
        return result.scalar_one_or_none()

    async def _generate_unique_account_number(self) -> str:
        """Generate a unique account number like ACC12345678."""
        import random
        max_attempts = 10
        for _ in range(max_attempts):
            # ACC + 8 digits
            number = f"ACC{random.randint(10000000, 99999999):08d}"
            existing = await self.session.execute(
                select(Account).where(Account.account_number == number)
            )
            if existing.scalar_one_or_none() is None:
                return number
        raise exceptions.ValidationError("Failed to generate unique account number")

    # ------------------------------------------------------------------
    # Send Money (Atomic Transfer)
    # ------------------------------------------------------------------

    async def send_money(
        self,
        sender_user_id: UUID,
        receiver_account_number: str,
        amount: Decimal,
        remark: Optional[str] = None,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None,
        location: Optional[str] = None,
    ) -> Transaction:
        """
        Send money from sender's account to receiver's account.

        This operation is atomic - all steps succeed or all fail.
        """
        # Validate amount
        if amount <= 0:
            raise exceptions.ValidationError("Amount must be greater than zero")

        # Quick (pre-lock) lookups for validation.
        sender_account = await self.get_account_by_user_id(sender_user_id)
        if sender_account is None:
            raise exceptions.NotFoundError("Sender account not found")
        if sender_account.status != AccountStatus.ACTIVE.value:
            raise exceptions.ValidationError("Sender account is not active")

        receiver_account = await self.get_account_by_number(receiver_account_number)
        if receiver_account is None:
            raise exceptions.NotFoundError("Receiver account not found")
        if receiver_account.status != AccountStatus.ACTIVE.value:
            raise exceptions.ValidationError("Receiver account is not active")

        # Prevent transfer to self
        if sender_account.id == receiver_account.id:
            raise exceptions.ValidationError("Cannot transfer to your own account")

        if sender_account.balance < amount:
            raise exceptions.ValidationError("Insufficient balance")

        # Generate transaction ID
        transaction_id = self._generate_transaction_id()

        # Perform atomic transfer. Use a nested transaction (SAVEPOINT) so we
        # roll back on error without aborting the surrounding request session
        # (which is already begun by FastAPI's get_session dependency).
        async with self.session.begin_nested():
            # Lock both accounts for update (prevents race conditions).
            sender_locked = (
                await self.session.execute(
                    select(Account)
                    .where(Account.id == sender_account.id)
                    .with_for_update()
                )
            ).scalar_one()

            receiver_locked = (
                await self.session.execute(
                    select(Account)
                    .where(Account.id == receiver_account.id)
                    .with_for_update()
                )
            ).scalar_one()

            # Re-verify balance under the lock.
            if sender_locked.balance < amount:
                raise exceptions.ValidationError("Insufficient balance")

            # Record balance before transfer for Rule 5 (Balance Drain)
            sender_balance_before = sender_locked.balance

            # Deduct from sender
            sender_locked.balance -= amount
            sender_locked.updated_at = datetime.now(timezone.utc)

            # Credit to receiver
            receiver_locked.balance += amount
            receiver_locked.updated_at = datetime.now(timezone.utc)

            # Create transaction record
            transaction = Transaction(
                id=uuid4(),
                transaction_id=transaction_id,
                sender_account_id=sender_locked.id,
                receiver_account_id=receiver_locked.id,
                amount=amount,
                remark=remark,
                status=TransactionStatus.COMPLETED.value,
                device_info=device_info,
                ip_address=ip_address,
                location=location,
                risk_score=None,
                is_flagged=False,
            )
            self.session.add(transaction)

            # Flush to materialize the transaction row inside the savepoint.
            await self.session.flush()

        # Commit the surrounding request transaction.
        await self.session.commit()
        await self.session.refresh(transaction)

        # ------------------------------------------------------------------
        # Automatic Fraud Engine Analysis (Phase 5)
        # ------------------------------------------------------------------
        from app.services.fraud_service import FraudService
        fraud_service = FraudService(self.session)
        await fraud_service.analyze_and_alert_transaction(
            transaction=transaction,
            sender_account=sender_account,
            sender_balance_before=sender_balance_before,
        )
        await self.session.commit()
        await self.session.refresh(transaction)

        return transaction

    def _generate_transaction_id(self) -> str:
        """Generate a unique transaction ID like TXN20240115123456789."""
        import random
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        random_part = f"{random.randint(100000, 999999):06d}"
        return f"TXN{timestamp}{random_part}"

    # ------------------------------------------------------------------
    # Transaction Queries
    # ------------------------------------------------------------------

    async def get_transaction_history(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[List[Transaction], int]:
        """Get paginated transaction history for a user (sent + received)."""
        # Get user's account
        account = await self.get_account_by_user_id(user_id)
        if account is None:
            raise exceptions.NotFoundError("Account not found")

        # Count total transactions
        count_stmt = select(func.count(Transaction.id)).where(
            or_(
                Transaction.sender_account_id == account.id,
                Transaction.receiver_account_id == account.id
            )
        )
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar_one()

        # Get paginated transactions
        stmt = (
            select(Transaction)
            .where(
                or_(
                    Transaction.sender_account_id == account.id,
                    Transaction.receiver_account_id == account.id
                )
            )
            .order_by(Transaction.timestamp.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(
                selectinload(Transaction.sender_account),
                selectinload(Transaction.receiver_account)
            )
        )
        result = await self.session.execute(stmt)
        transactions = result.scalars().all()

        return list(transactions), total

    async def get_transaction_by_id(
        self,
        transaction_id: str,
        user_id: UUID
    ) -> Transaction | None:
        """Get transaction by ID, only if user is sender or receiver."""
        account = await self.get_account_by_user_id(user_id)
        if account is None:
            return None

        result = await self.session.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.transaction_id == transaction_id,
                    or_(
                        Transaction.sender_account_id == account.id,
                        Transaction.receiver_account_id == account.id
                    )
                )
            )
            .options(
                selectinload(Transaction.sender_account),
                selectinload(Transaction.receiver_account)
            )
        )
        return result.scalar_one_or_none()

    async def get_live_transactions(self, limit: int = 50) -> List[Transaction]:
        """Get latest transactions across all accounts (for live feed)."""
        result = await self.session.execute(
            select(Transaction)
            .order_by(Transaction.timestamp.desc())
            .limit(limit)
            .options(
                selectinload(Transaction.sender_account),
                selectinload(Transaction.receiver_account)
            )
        )
        return list(result.scalars().all())