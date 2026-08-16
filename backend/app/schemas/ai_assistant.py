"""AI Investigator Assistant Pydantic schemas — Phase 9 Pro."""

from datetime import datetime
from uuid import UUID
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    """Investigator chat prompt request."""
    message: str = Field(..., min_length=1, description="Investigator query or command")
    context_id: Optional[str] = Field(None, description="Optional alert_id, transaction_id, or case_id context")


class RAGDocCitation(BaseModel):
    """Citation of an RBI circular, PMLA rule, or Bank SOP."""
    doc_id: str
    title: str
    category: str
    source: str
    content: str
    relevance_score: float


class XAIWeightItem(BaseModel):
    """Explainable AI feature weight / attribution item for visual charts."""
    feature: str
    weight: float
    impact: str  # POSITIVE, CRITICAL, NEGATIVE


class SimilarCaseMatch(BaseModel):
    """Historically similar fraud case match."""
    case_id: str
    similarity_percentage: float
    shared_patterns: List[str]
    fraud_type: str
    amount_at_risk: float
    status: str


class ChatResponse(BaseModel):
    """AI Copilot natural language answer, XAI weights, RAG citations, and suggestions."""
    model_config = ConfigDict(from_attributes=True)

    answer: str
    intent: str
    suggestions: List[str] = Field(default_factory=list)
    predicted_fraud_type: Optional[str] = None
    confidence_score: Optional[float] = None
    rag_citations: List[RAGDocCitation] = Field(default_factory=list)
    xai_weights: List[XAIWeightItem] = Field(default_factory=list)
    similar_cases: List[SimilarCaseMatch] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    context_data: Optional[Dict[str, Any]] = None
    created_at: datetime


class ChatHistoryItem(BaseModel):
    """Single archived chat interaction."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question: str
    response: str
    intent: str
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    """List of archived chat interactions."""
    history: List[ChatHistoryItem]
    total: int
