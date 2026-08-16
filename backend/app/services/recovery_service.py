"""Recovery Service — Phase 7 Recovery Intelligence Engine."""

from datetime import datetime, timezone
import random
from typing import List, Optional, Tuple
from uuid import UUID, uuid4

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import exceptions
from app.models.fraud_alert import FraudAlert
from app.models.recovery import RecoveryCase, RecoveryProbability, CaseStatus
from app.models.transaction import Transaction
from app.services.recovery_engine import RecoveryEngine


class RecoveryService:
    """Service layer for Recovery Intelligence Engine cases and stats."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def analyze_recovery(self, alert_identifier: str) -> RecoveryCase:
        """
        Analyze a fraud alert and generate or update a RecoveryCase.
        """
        # Fetch FraudAlert
        is_uuid = False
        try:
            val_uuid = UUID(alert_identifier)
            is_uuid = True
        except ValueError:
            pass

        if is_uuid:
            stmt = select(FraudAlert).where(or_(FraudAlert.id == val_uuid, FraudAlert.alert_id == alert_identifier))
        else:
            stmt = select(FraudAlert).where(FraudAlert.alert_id == alert_identifier)

        res = await self.session.execute(stmt)
        alert = res.scalar_one_or_none()

        if alert is None:
            raise exceptions.NotFoundError(f"Fraud alert '{alert_identifier}' not found")

        # Fetch associated transaction
        txn_stmt = select(Transaction).where(Transaction.id == alert.transaction_id)
        txn_res = await self.session.execute(txn_stmt)
        transaction = txn_res.scalar_one_or_none()

        if transaction is None:
            raise exceptions.NotFoundError(f"Transaction for alert '{alert_identifier}' not found")

        # Run RecoveryEngine evaluation
        result = await RecoveryEngine.evaluate_recovery(self.session, alert, transaction)

        # Check if RecoveryCase already exists for this alert
        case_stmt = select(RecoveryCase).where(RecoveryCase.alert_id == alert.id)
        existing_res = await self.session.execute(case_stmt)
        existing_case = existing_res.scalar_one_or_none()

        if existing_case:
            existing_case.recovery_score = result.recovery_score
            existing_case.recovery_probability = result.recovery_probability.value
            existing_case.current_holder_account = result.current_holder_account
            existing_case.amount_at_risk = result.amount_at_risk
            existing_case.recommended_action = result.recommended_action
            existing_case.updated_at = datetime.now(timezone.utc)
            case = existing_case
        else:
            case_id = self._generate_case_id()
            case = RecoveryCase(
                id=uuid4(),
                case_id=case_id,
                alert_id=alert.id,
                transaction_id=transaction.id,
                recovery_score=result.recovery_score,
                recovery_probability=result.recovery_probability.value,
                current_holder_account=result.current_holder_account,
                amount_at_risk=result.amount_at_risk,
                recommended_action=result.recommended_action,
                status=CaseStatus.OPEN.value,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            self.session.add(case)

        await self.session.commit()
        return await self.get_case(case.case_id)

    async def get_case(self, case_identifier: str) -> RecoveryCase:
        """Get recovery case by UUID id or case_id."""
        is_uuid = False
        try:
            val_uuid = UUID(case_identifier)
            is_uuid = True
        except ValueError:
            pass

        query = select(RecoveryCase).options(
            selectinload(RecoveryCase.alert),
            selectinload(RecoveryCase.transaction),
        )

        if is_uuid:
            stmt = query.where(or_(RecoveryCase.id == val_uuid, RecoveryCase.case_id == case_identifier))
        else:
            stmt = query.where(RecoveryCase.case_id == case_identifier)

        res = await self.session.execute(stmt)
        case = res.scalar_one_or_none()

        if case is None:
            raise exceptions.NotFoundError(f"Recovery case '{case_identifier}' not found")

        return case

    async def get_all_cases(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        probability: Optional[str] = None,
    ) -> Tuple[List[RecoveryCase], int]:
        """Get paginated recovery cases with optional status and probability filters."""
        query = select(RecoveryCase)

        filters = []
        if status:
            filters.append(RecoveryCase.status == status.upper())
        if probability:
            filters.append(RecoveryCase.recovery_probability == probability.upper())

        if filters:
            query = query.where(and_(*filters))

        count_stmt = select(func.count(RecoveryCase.id))
        if filters:
            count_stmt = count_stmt.where(and_(*filters))

        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar_one() or 0

        res_stmt = (
            query.order_by(RecoveryCase.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(
                selectinload(RecoveryCase.alert),
                selectinload(RecoveryCase.transaction),
            )
        )
        res = await self.session.execute(res_stmt)
        cases = res.scalars().all()

        return list(cases), total

    async def get_high_probability_cases(
        self, page: int = 1, page_size: int = 20
    ) -> Tuple[List[RecoveryCase], int]:
        """Get high recovery probability cases (HIGH probability)."""
        return await self.get_all_cases(
            page=page, page_size=page_size, probability=RecoveryProbability.HIGH.value
        )

    async def recalculate_case(self, case_identifier: str) -> RecoveryCase:
        """Recalculate recovery intelligence for an existing recovery case."""
        case = await self.get_case(case_identifier)

        # Re-fetch alert & transaction
        alert_stmt = select(FraudAlert).where(FraudAlert.id == case.alert_id)
        alert_res = await self.session.execute(alert_stmt)
        alert = alert_res.scalar_one()

        txn_stmt = select(Transaction).where(Transaction.id == case.transaction_id)
        txn_res = await self.session.execute(txn_stmt)
        txn = txn_res.scalar_one()

        result = await RecoveryEngine.evaluate_recovery(self.session, alert, txn)

        case.recovery_score = result.recovery_score
        case.recovery_probability = result.recovery_probability.value
        case.current_holder_account = result.current_holder_account
        case.amount_at_risk = result.amount_at_risk
        case.recommended_action = result.recommended_action
        case.updated_at = datetime.now(timezone.utc)

        await self.session.commit()
        return await self.get_case(case.case_id)

    async def get_recovery_stats(self) -> dict:
        """
        Get recovery intelligence statistics summary.
        {
            "total_cases": 120,
            "high_probability": 35,
            "medium_probability": 50,
            "low_probability": 35,
            "recovered": 10
        }
        """
        total_res = await self.session.execute(select(func.count(RecoveryCase.id)))
        total_cases = total_res.scalar_one() or 0

        high_res = await self.session.execute(
            select(func.count(RecoveryCase.id)).where(RecoveryCase.recovery_probability == RecoveryProbability.HIGH.value)
        )
        high_prob = high_res.scalar_one() or 0

        med_res = await self.session.execute(
            select(func.count(RecoveryCase.id)).where(RecoveryCase.recovery_probability == RecoveryProbability.MEDIUM.value)
        )
        med_prob = med_res.scalar_one() or 0

        low_res = await self.session.execute(
            select(func.count(RecoveryCase.id)).where(RecoveryCase.recovery_probability == RecoveryProbability.LOW.value)
        )
        low_prob = low_res.scalar_one() or 0

        rec_res = await self.session.execute(
            select(func.count(RecoveryCase.id)).where(RecoveryCase.status == CaseStatus.RECOVERED.value)
        )
        recovered = rec_res.scalar_one() or 0

        return {
            "total_cases": total_cases,
            "high_probability": high_prob,
            "medium_probability": med_prob,
            "low_probability": low_prob,
            "recovered": recovered,
        }

    def _generate_case_id(self) -> str:
        """Generate unique case ID like REC202608160001."""
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        rnd_str = f"{random.randint(1000, 9999):04d}"
        return f"REC{now_str}{rnd_str}"
