"""Database models package — imports all models for Alembic autogenerate."""

from app.database import Base
from app.models.user import User, UserRole
from app.models.account import Account, AccountStatus
from app.models.transaction import Transaction, TransactionStatus
from app.models.fraud_alert import FraudAlert, Severity, AlertStatus

__all__ = [
    "Base",
    "User",
    "UserRole",
    "Account",
    "AccountStatus",
    "Transaction",
    "TransactionStatus",
    "FraudAlert",
    "Severity",
    "AlertStatus",
]
