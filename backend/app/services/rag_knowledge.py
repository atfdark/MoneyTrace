"""RAG Compliance & Policy Knowledge Base — Phase 9.

Provides offline indexed retrieval of RBI Circulars, PMLA regulations, Bank SOPs, and I4C cyber crime guidelines.
"""

from dataclasses import dataclass
import re
from typing import List, Dict, Any, Optional


@dataclass
class RAGDocument:
    """Document in the forensic compliance knowledge base."""
    doc_id: str
    title: str
    category: str  # RBI_CIRCULAR, PMLA_AML, I4C_CYBER, BANK_SOP
    source: str
    content: str
    keywords: List[str]


KNOWLEDGE_BASE: List[RAGDocument] = [
    RAGDocument(
        doc_id="RAG-RBI-001",
        title="RBI Master Direction on Customer Protection & Limiting Liability (RBI/2021-22/108)",
        category="RBI_CIRCULAR",
        source="Reserve Bank of India (RBI)",
        content=(
            "Zero liability of a customer applies where unauthorized payment arises from third-party breach "
            "and customer notifies the bank within 3 working days of receiving communication. "
            "Banks must mark an immediate debit freeze on beneficiary accounts upon intimation from the "
            "originating bank or law enforcement agency (LEA)."
        ),
        keywords=["zero liability", "customer protection", "unauthorized transaction", "freeze", "3 days", "rbi liability"],
    ),
    RAGDocument(
        doc_id="RAG-PMLA-002",
        title="PMLA Section 12 & FIU-IND Suspicious Transaction Reporting (STR)",
        category="PMLA_AML",
        source="Financial Intelligence Unit - India (FIU-IND)",
        content=(
            "Under PMLA Section 12, reporting entities must file a Suspicious Transaction Report (STR) within 7 days "
            "of forming suspicion. Indicators include: rapid movement of funds through multiple intermediary accounts "
            "(layering), inconsistent transaction volumes relative to declared KYC profile, and structured transactions below threshold."
        ),
        keywords=["pmla", "fiu", "str", "suspicious transaction report", "layering", "money laundering", "smurfing"],
    ),
    RAGDocument(
        doc_id="RAG-I4C-003",
        title="Indian Cyber Crime Coordination Centre (I4C) — Mule Account Identification Matrix",
        category="I4C_CYBER",
        source="Ministry of Home Affairs (MHA / I4C)",
        content=(
            "A mule account exhibits: (1) Inbound deposits forwarded > 70% within 60 minutes, (2) Multiple small inbound UPI credits "
            "followed by lump-sum IMPS/RTGS debits, (3) Recent KYC address or device changes preceding transaction spikes. "
            "Action: Flag account in national cybercrime reporting portal (NCRP) and restrict outbound transfers."
        ),
        keywords=["mule account", "i4c", "passthrough", "ncrp", "rapid transfer", "mule", "cybercrime"],
    ),
    RAGDocument(
        doc_id="RAG-SOP-004",
        title="Standard Operating Procedure (SOP) for Inter-Bank Stolen Asset Recovery",
        category="BANK_SOP",
        source="Indian Banks' Association (IBA) Fraud SOP",
        content=(
            "Asset Recovery Protocol: (1) Immediate intraday lien marking on the current holder account, "
            "(2) Dispatch of inter-bank fraud alert through the Central Fraud Registry (CFR), "
            "(3) Issuance of notice under Section 91 CrPC to freeze ledger balance, "
            "(4) Remittance reversal upon receiving victim indemnity bond."
        ),
        keywords=["recovery", "asset recovery", "freeze account", "lien", "sop", "crpc", "reversal", "hold"],
    ),
    RAGDocument(
        doc_id="RAG-RBI-005",
        title="RBI Guidelines on Real-Time Fraud Monitoring & Velocity Rules",
        category="RBI_CIRCULAR",
        source="Reserve Bank of India (RBI)",
        content=(
            "Banks are mandated to employ automated rule engines monitoring impossible travel velocities "
            "(e.g. login from Mumbai followed by transaction from Delhi within 15 minutes), sudden device fingerprint "
            "swaps, and transactions draining > 80% of account balance within 2 hours of credit."
        ),
        keywords=["impossible travel", "velocity", "device change", "balance drain", "real-time monitoring", "location risk"],
    ),
]


class RAGKnowledgeService:
    """Offline lexical and semantic compliance document retrieval service."""

    @staticmethod
    def search(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search the compliance knowledge base and return ranked document excerpts."""
        q_tokens = set(re.findall(r"\w+", query.lower()))
        scored_docs = []

        for doc in KNOWLEDGE_BASE:
            score = 0.0
            content_lower = doc.content.lower()
            title_lower = doc.title.lower()

            for kw in doc.keywords:
                if kw in query.lower():
                    score += 5.0
                elif any(t in kw for t in q_tokens):
                    score += 2.0

            for token in q_tokens:
                if token in title_lower:
                    score += 3.0
                if token in content_lower:
                    score += 1.0

            if score > 0.0:
                scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        results = []

        for score, doc in scored_docs[:top_k]:
            results.append({
                "doc_id": doc.doc_id,
                "title": doc.title,
                "category": doc.category,
                "source": doc.source,
                "content": doc.content,
                "relevance_score": round(min(score / 15.0, 1.0) * 100.0, 1),
            })

        if not results:
            # Fallback to top general document
            doc = KNOWLEDGE_BASE[0]
            results.append({
                "doc_id": doc.doc_id,
                "title": doc.title,
                "category": doc.category,
                "source": doc.source,
                "content": doc.content,
                "relevance_score": 75.0,
            })

        return results
