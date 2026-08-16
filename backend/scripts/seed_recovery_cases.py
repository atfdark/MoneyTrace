#!/usr/bin/env python
"""Seed script for Phase 7 – Recovery Intelligence Cases & Scenarios."""

import asyncio
import sys
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.database import Base
from app.models.fraud_alert import FraudAlert
from app.services.recovery_service import RecoveryService
from scripts.seed_graph_data import seed_graph_data


async def seed_recovery_cases():
    """Seed recovery intelligence cases across all 5 test scenarios."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE fraud_alerts ADD COLUMN rule_breakdown JSON"))
        except Exception:
            pass

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if alerts exist, run seed_graph_data if needed
        res = await session.execute(select(FraudAlert))
        alerts = list(res.scalars().all())

        if len(alerts) < 3:
            print("Not enough fraud alerts found, running seed_graph_data first...")
            await session.close()
            await seed_graph_data()
            async with async_session() as session2:
                res = await session2.execute(select(FraudAlert))
                alerts = list(res.scalars().all())
                session = session2

        print(f"Analyzing recovery for {len(alerts)} existing fraud alerts...")

        recovery_service = RecoveryService(session)
        created_cases = []

        for idx, alert in enumerate(alerts):
            case = await recovery_service.analyze_recovery(alert.alert_id)
            created_cases.append(case)
            print(
                f"  Case #{idx+1} [{case.case_id}] -> Score: {case.recovery_score}, "
                f"Prob: {case.recovery_probability}, Action: '{case.recommended_action}'"
            )

        # Print statistics summary
        stats = await recovery_service.get_recovery_stats()
        print("\n[OK] Recovery intelligence cases successfully seeded!")
        print(f"  - Total Cases: {stats['total_cases']}")
        print(f"  - High Probability Cases: {stats['high_probability']}")
        print(f"  - Medium Probability Cases: {stats['medium_probability']}")
        print(f"  - Low Probability Cases: {stats['low_probability']}")
        print(f"  - Recovered Cases: {stats['recovered']}")


if __name__ == "__main__":
    asyncio.run(seed_recovery_cases())
