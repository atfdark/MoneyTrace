"""AI Investigator Assistant (MoneyTrace Copilot Pro) endpoints — Phase 9."""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_active_user
from app.database import get_session
from app.models.user import User
from app.schemas.ai_assistant import (
    ChatHistoryItem,
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    RAGDocCitation,
    SimilarCaseMatch,
)
from app.services.ai_assistant import AIInvestigatorAssistant
from app.services.case_similarity import CaseSimilarityService
from app.services.rag_knowledge import RAGKnowledgeService

router = APIRouter()


# ---------------------------------------------------------------------------
# 1. Main Conversational AI Chat Endpoint
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> ChatResponse:
    """
    Send natural language question to MoneyTrace AI Copilot.

    Supports:
    - Explaining fraud alert triggers and risk score breakdowns
    - Tracing money flows across multiple hops
    - Evaluating recovery likelihood and recommending actions
    - Explaining mule and collector account behaviors
    - Generating comprehensive forensic case summaries
    - RAG compliance retrieval (RBI, PMLA, Bank SOPs)
    - ML fraud typology prediction & XAI feature attributions
    """
    assistant = AIInvestigatorAssistant(session)
    return await assistant.chat(
        message=request.message,
        user_id=current_user.id,
        context_id=request.context_id,
    )


# ---------------------------------------------------------------------------
# 2. Explain Specific Transaction
# ---------------------------------------------------------------------------

@router.post("/explain-transaction/{transaction_id}", response_model=ChatResponse)
async def explain_transaction_flag(
    transaction_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> ChatResponse:
    """Explain why a specific transaction was flagged with rule breakdown and XAI weights."""
    assistant = AIInvestigatorAssistant(session)
    return await assistant.chat(
        message=f"Why was transaction {transaction_id} flagged?",
        user_id=current_user.id,
        context_id=transaction_id,
    )


# ---------------------------------------------------------------------------
# 3. Explain Specific Fraud Alert
# ---------------------------------------------------------------------------

@router.post("/explain-alert/{alert_id}", response_model=ChatResponse)
async def explain_fraud_alert(
    alert_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> ChatResponse:
    """Explain why an alert was triggered and recommend investigator response."""
    assistant = AIInvestigatorAssistant(session)
    return await assistant.chat(
        message=f"Explain fraud alert {alert_id}",
        user_id=current_user.id,
        context_id=alert_id,
    )


# ---------------------------------------------------------------------------
# 4. Explain Suspicious Account / Mule Analysis
# ---------------------------------------------------------------------------

@router.post("/explain-account/{account_number}", response_model=ChatResponse)
async def explain_suspicious_account(
    account_number: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> ChatResponse:
    """Explain mule behavior, passthrough ratios, and suspicious velocity for an account."""
    assistant = AIInvestigatorAssistant(session)
    return await assistant.chat(
        message=f"Why is {account_number} suspicious?",
        user_id=current_user.id,
        context_id=account_number,
    )


# ---------------------------------------------------------------------------
# 5. Explain Recovery Chances / Case Briefing
# ---------------------------------------------------------------------------

@router.post("/explain-recovery/{case_id}", response_model=ChatResponse)
async def explain_recovery_case(
    case_id: str,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> ChatResponse:
    """Explain recovery score, probability, and recommended asset preservation actions."""
    assistant = AIInvestigatorAssistant(session)
    return await assistant.chat(
        message=f"Can money be recovered for case {case_id}?",
        user_id=current_user.id,
        context_id=case_id,
    )


# ---------------------------------------------------------------------------
# 6. Similar Cases Search
# ---------------------------------------------------------------------------

@router.post("/similar-cases/{case_id}", response_model=List[SimilarCaseMatch])
async def find_similar_cases(
    case_id: str,
    top_k: int = Query(4, ge=1, le=10),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> List[SimilarCaseMatch]:
    """Find historically similar fraud cases matching amount, velocity, and typology."""
    service = CaseSimilarityService(session)
    matches = await service.find_similar_cases(case_id, top_k=top_k)
    return [SimilarCaseMatch(**m) for m in matches]


# ---------------------------------------------------------------------------
# 7. RAG Compliance Knowledge Search
# ---------------------------------------------------------------------------

@router.get("/rag-search", response_model=List[RAGDocCitation])
async def search_compliance_rag(
    query: str = Query(..., min_length=2, description="Search query for RBI circulars, PMLA, Bank SOPs"),
    top_k: int = Query(3, ge=1, le=10),
    current_user: User = Depends(get_current_active_user),
) -> List[RAGDocCitation]:
    """Search offline compliance knowledge base for RBI fraud circulars and banking SOPs."""
    results = RAGKnowledgeService.search(query=query, top_k=top_k)
    return [RAGDocCitation(**r) for r in results]


# ---------------------------------------------------------------------------
# 8. Chat History Retrieval
# ---------------------------------------------------------------------------

@router.get("/history", response_model=ChatHistoryResponse)
async def get_assistant_history(
    limit: int = Query(50, ge=1, le=200, description="Max history logs to return"),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
) -> ChatHistoryResponse:
    """Retrieve archived AI copilot conversation history for the current investigator."""
    assistant = AIInvestigatorAssistant(session)
    history_logs = await assistant.get_chat_history(user_id=current_user.id, limit=limit)

    items = [
        ChatHistoryItem(
            id=log.id,
            question=log.question,
            response=log.response,
            intent=log.intent,
            created_at=log.created_at,
        )
        for log in history_logs
    ]

    return ChatHistoryResponse(history=items, total=len(items))
