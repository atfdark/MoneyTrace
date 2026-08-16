#!/usr/bin/env python
"""Seed script for Phase 9 – AI Investigator Assistant (MoneyTrace Copilot)."""

import asyncio
import sys
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.database import Base
from app.models.investigator_chat import InvestigatorChat
from app.models.user import User
from app.services.ai_assistant import AIInvestigatorAssistant


async def seed_ai_chat():
    """Seed realistic forensic investigator chat logs."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Get an investigator or admin user
        user_res = await session.execute(select(User))
        user = user_res.scalars().first()
        if not user:
            print("No user found! Please seed users first.")
            return

        print(f"Seeding AI Copilot interactions for investigator: {user.email}...")

        assistant = AIInvestigatorAssistant(session)

        sample_prompts = [
            "Why was transaction TXN_TRACE_HOP1 flagged?",
            "Show money trail for TXN_TRACE_HOP1",
            "Why is ACC1002 suspicious?",
            "Can this money be recovered?",
            "Summarize Case REC202608168920",
            "What is the RBI guideline for unauthorized fraud?",
        ]

        for idx, prompt in enumerate(sample_prompts):
            print(f"  [{idx+1}/{len(sample_prompts)}] Processing query: '{prompt}'...")
            res = await assistant.chat(message=prompt, user_id=user.id)
            print(f"      -> Intent: {res.intent} | Typology: {res.predicted_fraud_type}")

        print("\n[OK] Phase 9 AI Investigator Assistant successfully seeded with sample conversations!")


if __name__ == "__main__":
    asyncio.run(seed_ai_chat())
