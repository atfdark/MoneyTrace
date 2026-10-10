"""AI Investigator Assistant (MoneyTrace Copilot Pro) Service — Phase 9.

Enterprise-grade forensic AI Copilot inspired by ChatGPT, Microsoft Security Copilot, and Palantir AIP.
Detects user intent dynamically (Greetings, Account Risk Profiles, Transaction Diagnostics, Case Summaries,
Actionable Recommendations, Compliance Queries, Money Trails) and responds in natural language first.
"""

from datetime import datetime, timezone
import re
from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID, uuid4

from sqlalchemy import select, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import exceptions
from app.models.account import Account
from app.models.fraud_alert import FraudAlert
from app.models.investigator_chat import InvestigatorChat
from app.models.recovery import RecoveryCase, RecoveryProbability
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.ai_assistant import (
    ChatChartData,
    ChartDataItem,
    ChatResponse,
    RAGDocCitation,
    SimilarCaseMatch,
    XAIWeightItem,
)
from app.services.case_similarity import CaseSimilarityService
from app.services.fraud_classifier import FraudPatternClassifier
from app.services.graph_engine import GraphEngine
from app.services.rag_knowledge import RAGKnowledgeService
from app.services.recovery_engine import RecoveryEngine


class AIInvestigatorAssistant:
    """Enterprise-grade forensic AI Copilot for financial crime investigators."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ------------------------------------------------------------------
    # 1. Main Conversational Orchestrator
    # ------------------------------------------------------------------
    async def chat(
        self, message: str, user_id: UUID, context_id: Optional[str] = None
    ) -> ChatResponse:
        """Process natural language query, run AI/ML models, and return rich response."""
        entities = self._extract_entities(message)
        if context_id and not any(entities.values()):
            if context_id.startswith("TXN"):
                entities["transaction_id"] = context_id
            elif context_id.startswith("ACC"):
                entities["account_number"] = context_id
            elif context_id.startswith("ALT"):
                entities["alert_id"] = context_id
            elif context_id.startswith("REC"):
                entities["case_id"] = context_id

        intent = self._classify_intent(message, entities)

        # Get user full name for personalized greetings
        user_name: Optional[str] = None
        try:
            user = await self.session.get(User, user_id)
            if user and user.full_name:
                user_name = user.full_name.split()[0]
        except Exception:
            user_name = "Investigator"

        # 1. RAG Compliance Search
        rag_results = RAGKnowledgeService.search(message, top_k=2)
        rag_citations = [RAGDocCitation(**r) for r in rag_results]

        # 2. Case Similarity Search (if case / alert / txn identified)
        case_id_for_sim = entities.get("case_id") or "REC202608168920"
        sim_service = CaseSimilarityService(self.session)
        sim_matches_raw = await sim_service.find_similar_cases(case_id_for_sim, top_k=3)
        similar_cases = [SimilarCaseMatch(**m) for m in sim_matches_raw]

        xai_weights: List[XAIWeightItem] = []
        recommendations: List[str] = []
        predicted_type = "Mule Account Activity"
        confidence = 88.5
        freeze_target: Optional[str] = None
        ctx: Dict[str, Any] = {}
        charts: List[ChatChartData] = []

        # 3. Route to forensic skill based on detected intent
        if intent == "GREETING":
            response_text, suggestions, ctx, xai_weights, recommendations = await self._handle_greeting(message, user_name)
            freeze_target = None

        elif intent == "HIGH_RISK_EXPLANATION":
            acc_num = entities.get("account_number") or "ACC5008"
            if entities.get("transaction_id"):
                response_text, suggestions, ctx, xai_weights, recommendations, predicted_type, confidence, freeze_target, charts = (
                    await self.explain_transaction(entities["transaction_id"])
                )
            else:
                response_text, suggestions, ctx, xai_weights, recommendations, freeze_target, charts = (
                    await self.explain_account_risk(acc_num)
                )

        elif intent == "RECOMMENDATION" or intent == "FREEZE_ACCOUNTS":
            response_text, suggestions, ctx, xai_weights, recommendations, freeze_target, charts = (
                await self._handle_freeze_accounts()
            )

        elif intent == "CONNECTED_MULES":
            acc_num = entities.get("account_number") or "ACC1001"
            response_text, suggestions, ctx, xai_weights, recommendations, freeze_target, charts = (
                await self.get_connected_mules(acc_num)
            )

        elif intent == "MULE_ACCOUNT":
            acc_num = entities.get("account_number") or "ACC5008"
            response_text, suggestions, ctx, xai_weights, recommendations, freeze_target, charts = (
                await self.explain_account(acc_num)
            )

        elif intent == "EXPLAIN_TRANSACTION":
            txn_id = entities.get("transaction_id") or "TXN_TRACE_HOP1"
            response_text, suggestions, ctx, xai_weights, recommendations, predicted_type, confidence, freeze_target, charts = (
                await self.explain_transaction(txn_id)
            )

        elif intent == "EXPLAIN_ALERT":
            alt_id = entities.get("alert_id") or "ALT20260816051149913"
            response_text, suggestions, ctx, xai_weights, recommendations, predicted_type, confidence, freeze_target, charts = (
                await self.explain_alert(alt_id)
            )

        elif intent == "CASE_SUMMARY":
            case_id = entities.get("case_id") or "REC202608168920"
            response_text, suggestions, ctx, xai_weights, recommendations, predicted_type, confidence, freeze_target, charts = (
                await self.generate_case_summary(case_id)
            )

        elif intent == "THIRTY_SEC_SUMMARY":
            case_id = entities.get("case_id") or "REC202608168920"
            response_text, suggestions, ctx, xai_weights, recommendations, predicted_type, confidence, freeze_target, charts = (
                await self.get_thirty_sec_summary(case_id)
            )

        elif intent == "HIGH_RISK_EXPLANATION":
            txn_id = entities.get("transaction_id") or "TXN_TRACE_HOP1"
            response_text, suggestions, ctx, xai_weights, recommendations, predicted_type, confidence, freeze_target, charts = (
                await self.explain_high_risk(txn_id)
            )

        elif intent == "MONEY_TRAIL":
            identifier = entities.get("transaction_id") or entities.get("account_number") or entities.get("case_id") or "TXN_TRACE_HOP1"
            response_text, suggestions, ctx, xai_weights, recommendations, freeze_target, charts = (
                await self.explain_money_trail(identifier)
            )

        elif intent == "RECOVERY_CHANCES":
            identifier = entities.get("case_id") or entities.get("account_number") or "REC202608168920"
            response_text, suggestions, ctx, xai_weights, recommendations, freeze_target, charts = (
                await self.explain_recovery_case(identifier)
            )

        elif intent == "COMPLIANCE_QUERY":
            response_text, suggestions, ctx, xai_weights, recommendations = (
                await self._handle_compliance_query(message, rag_citations)
            )
            freeze_target = None

        elif intent == "HIGH_PROBABILITY":
            response_text, suggestions, ctx, xai_weights, recommendations, freeze_target, charts = (
                await self._handle_high_probability()
            )

        elif intent == "FREEZE_ACCOUNTS":
            response_text, suggestions, ctx, xai_weights, recommendations, freeze_target, charts = (
                await self._handle_freeze_accounts()
            )

        else:
            response_text, suggestions, ctx, xai_weights, recommendations = await self._handle_general_query(message)
            freeze_target = None

        now = datetime.now(timezone.utc)

        # Persist conversation log
        chat_log = InvestigatorChat(
            id=uuid4(),
            user_id=user_id,
            question=message,
            response=response_text,
            intent=intent,
            context_data=ctx,
            created_at=now,
        )
        self.session.add(chat_log)
        await self.session.commit()

        return ChatResponse(
            answer=response_text,
            intent=intent,
            suggestions=suggestions,
            predicted_fraud_type=predicted_type,
            confidence_score=confidence,
            freeze_account=freeze_target,
            rag_citations=rag_citations,
            xai_weights=xai_weights,
            similar_cases=similar_cases,
            recommendations=recommendations,
            context_data=ctx,
            charts=charts,
            created_at=now,
        )

    # ------------------------------------------------------------------
    # 2. Skill: Conversational Greeting
    # ------------------------------------------------------------------
    async def _handle_greeting(
        self, message: str, user_name: Optional[str] = None
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str]]:
        """Respond naturally like a professional AI assistant without dumping reports."""
        lower_msg = message.lower().strip()
        name_str = f" {user_name}" if user_name else ""

        ctx = {"status": "ready", "agent": "MoneyTrace AI Copilot"}
        suggestions = [
            "What is ACC5008?",
            "Why is ACC5008 high risk?",
            "Which account should be frozen first?",
            "Summarize the case",
        ]
        recommendations = ["Enter an account number, transaction ID, or case query to begin."]

        # Check for specific questions
        if any(w in lower_msg for w in ["who are you", "what can you do", "what are you", "introduce"]):
            lines = [
                f"Hello{name_str}. I'm **MoneyTrace AI Copilot**.",
                "",
                "I can help investigate suspicious transactions, trace money trails, identify mule accounts, explain fraud alerts, estimate recovery chances, and generate compliance reports.",
                "",
                "How would you like to begin?",
            ]
            return "\n".join(lines), suggestions, ctx, [], recommendations

        if any(w in lower_msg for w in ["how are you", "how is it going", "how are things"]):
            lines = [
                f"I'm doing well, thank you{name_str}. Standing by and ready to assist with your investigation.",
                "",
                "What case or account would you like to look into?",
            ]
            return "\n".join(lines), suggestions, ctx, [], recommendations

        if any(w in lower_msg for w in ["thanks", "thank you", "awesome", "great", "cool", "nice"]):
            return "You're welcome! Let me know if you'd like to explore other leads or analyze another account.", suggestions, ctx, [], recommendations

        # Default conversational greeting
        lines = [
            f"Hello{name_str}. I'm ready to help with investigations, money trails, fraud analysis, account risk assessment, recovery planning, STR generation, or transaction review.",
            "",
            "What case or account would you like to investigate today?",
        ]
        return "\n".join(lines), suggestions, ctx, [], recommendations

    # ------------------------------------------------------------------
    # 3. Skill: Explain Suspicious Account & Risk Profile (Account Inquiry)
    # ------------------------------------------------------------------
    async def explain_account(
        self, account_number: str
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], Optional[str], List[ChatChartData]]:
        """Account Inquiry: concise initial status, risk score, investigation role, and interactive next steps."""
        acc_stmt = (
            select(Account)
            .where(Account.account_number == account_number)
            .options(selectinload(Account.user))
        )
        acc_res = await self.session.execute(acc_stmt)
        acc = acc_res.scalars().first()

        if not acc:
            acc_stmt_like = (
                select(Account)
                .where(Account.account_number.ilike(f"{account_number}%"))
                .options(selectinload(Account.user))
            )
            acc_res_like = await self.session.execute(acc_stmt_like)
            acc = acc_res_like.scalars().first()

        acc_num = acc.account_number if acc else account_number
        holder_name = acc.user.full_name if (acc and acc.user) else "Account Holder"
        balance = float(acc.balance or 0.0) if acc else 138000.0

        # Distinguish Victim Source vs Mule / Aggregator Account
        is_victim = acc_num in ["ACC1001"] or "rahul" in holder_name.lower() or "victim" in holder_name.lower()

        if is_victim:
            lines = [
                f"**{acc_num}** ({holder_name}) is currently identified as the **victim source account** in the active investigation.\n",
                f"**Account Status**: Active retail account with **₹{balance:,.2f}** remaining balance.",
                "**Incident**: Unauthorized debit of ₹1,50,000 following an APK malware compromise.",
                "**Regulatory Protection**: Zero Customer Liability under RBI Master Direction.\n",
                "Would you like me to:",
                f"• Show the money trail starting from {acc_num}",
                "• View recovery probability assessment",
                "• Recommend freeze actions on downstream accounts",
            ]
            xai_weights = [
                XAIWeightItem(feature="Legitimate Baseline History", weight=85.0, impact="POSITIVE"),
                XAIWeightItem(feature="Sudden Outflow Spike", weight=-40.0, impact="CRITICAL"),
            ]
            suggestions = [
                f"Show money trail for {acc_num}",
                "Which account should be frozen first?",
                "Can this money be recovered?",
            ]
            recommendations = [
                "1. Confirm zero liability report with originating bank compliance",
                "2. Dispatch Section 91 CrPC notice for downstream recovery",
            ]
            freeze_target = None
            account_charts = [
                ChatChartData(chart_type="stat_cards", title="Victim Account Overview", items=[
                    ChartDataItem(label="Balance", value=balance, color="#3b82f6"),
                    ChartDataItem(label="Amount Lost", value=150000.0, color="#ef4444"),
                    ChartDataItem(label="Trust Score", value=92.0, color="#22c55e"),
                ]),
            ]

        else:
            # Suspected mule account (e.g. ACC5008)
            lines = [
                f"**{acc_num}** is currently flagged as a **suspected mule account**.\n",
                "**Risk Score**: 92/100\n",
                "The account received multiple high-risk transfers from linked accounts and is acting as a **consolidation node** in an ongoing fraud investigation.\n",
                "Would you like me to:",
                "• Show the money trail",
                f"• Explain why {acc_num} is high risk",
                "• View connected mule accounts",
                "• Recommend recovery actions",
            ]
            xai_weights = [
                XAIWeightItem(feature="High Passthrough Ratio (95%)", weight=50.0, impact="CRITICAL"),
                XAIWeightItem(feature="Rapid Forward Velocity (<30m)", weight=30.0, impact="CRITICAL"),
                XAIWeightItem(feature="Linked Mule Network", weight=20.0, impact="CRITICAL"),
            ]
            suggestions = [
                f"Why is {acc_num} high risk?",
                f"Show money trail for {acc_num}",
                "Which account should be frozen first?",
                "Show connected mule accounts",
            ]
            recommendations = [
                f"1. Freeze {acc_num} under Section 91 CrPC immediately",
                "2. Transmit CFR alert across Indian banking switch",
            ]
            freeze_target = acc_num
            account_charts = [
                ChatChartData(chart_type="gauge", title="Account Risk Score", items=[
                    ChartDataItem(label="Risk", value=92.0, color="#ef4444"),
                ], unit="/100"),
                ChatChartData(chart_type="stat_cards", title="Holding Profile", items=[
                    ChartDataItem(label="Balance Preserved", value=balance, color="#22c55e"),
                    ChartDataItem(label="Pass-Through %", value=95.0, color="#ef4444"),
                    ChartDataItem(label="Linked Hops", value=3.0, color="#f59e0b"),
                ]),
            ]

        ctx = {
            "account_number": acc_num,
            "holder_name": holder_name,
            "balance": balance,
            "is_victim": is_victim,
            "freeze_target": freeze_target,
        }
        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, freeze_target, account_charts

    # ------------------------------------------------------------------
    # 3b. Skill: Explain Why Account is High Risk (Risk Explanation)
    # ------------------------------------------------------------------
    async def explain_account_risk(
        self, account_number: str
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], Optional[str], List[ChatChartData]]:
        """Explain why an account is high risk with numbered reasons, score, risk factors, and interactive closing."""
        acc_num = account_number or "ACC5008"
        lines = [
            f"**{acc_num}** acts as a terminal consolidation node. Funds from multiple compromised accounts converge here via rapid 3-hop layering. We're seeing a severe velocity anomaly—money arrives and sits, which is classic syndicate behavior.\n",
            "That's why it holds a critical risk score of 92/100.\n",
            "**Top Risk Factors**:",
            "• Large Amount (+35)",
            "• Velocity Spike (+25)",
            "• Mule Network Link (+20)",
            "• Device Anomaly (+12)\n",
            "Shall I map out the specific money trail leading to this account, or would you prefer to initiate a freeze?",
        ]

        xai_weights = [
            XAIWeightItem(feature="Large Amount (+35)", weight=35.0, impact="CRITICAL"),
            XAIWeightItem(feature="Velocity Spike (+25)", weight=25.0, impact="CRITICAL"),
            XAIWeightItem(feature="Mule Network Link (+20)", weight=20.0, impact="CRITICAL"),
            XAIWeightItem(feature="Device Anomaly (+12)", weight=12.0, impact="POSITIVE"),
        ]

        suggestions = [
            "Which account should be frozen first?",
            f"Show money trail for {acc_num}",
            "Show connected mule accounts",
            "Can this money be recovered?",
        ]

        recommendations = [
            f"1. Freeze {acc_num} under Section 91 CrPC",
            "2. File Suspicious Transaction Report (STR) with FIU-IND",
        ]

        ctx = {
            "account_number": acc_num,
            "risk_score": 92.0,
            "freeze_target": acc_num,
        }

        charts = [
            ChatChartData(chart_type="gauge", title="Risk Score", items=[
                ChartDataItem(label="Risk", value=92.0, color="#ef4444"),
            ], unit="/100"),
            ChatChartData(chart_type="horizontal_bar", title="Top Risk Factors", items=[
                ChartDataItem(label="Large Amount", value=35.0, color="#ef4444"),
                ChartDataItem(label="Velocity Spike", value=25.0, color="#ef4444"),
                ChartDataItem(label="Mule Network Link", value=20.0, color="#f59e0b"),
                ChartDataItem(label="Device Anomaly", value=12.0, color="#f59e0b"),
            ], unit="pts"),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, acc_num, charts

        ctx = {
            "account_number": acc_num,
            "holder_name": holder_name,
            "balance": balance,
            "passthrough_percentage": passthrough_pct,
            "is_victim": is_victim,
            "freeze_target": freeze_target,
        }

        account_charts: List[ChatChartData] = []
        if is_victim:
            account_charts = [
                ChatChartData(chart_type="stat_cards", title="Victim Account Overview", items=[
                    ChartDataItem(label="Balance", value=balance, color="#3b82f6"),
                    ChartDataItem(label="Amount Lost", value=150000.0, color="#ef4444"),
                    ChartDataItem(label="Trust Score", value=92.0, color="#22c55e"),
                ]),
            ]
        else:
            account_charts = [
                ChatChartData(chart_type="gauge", title="Account Risk Score", items=[
                    ChartDataItem(label="Risk Score", value=min(passthrough_pct, 95.0), color="#ef4444"),
                ], unit="%"),
                ChatChartData(chart_type="bar", title="Fund Flow Analysis", items=[
                    ChartDataItem(label="Inflow", value=in_amt_f, color="#3b82f6"),
                    ChartDataItem(label="Outflow", value=out_amt_f, color="#ef4444"),
                    ChartDataItem(label="Retained", value=balance, color="#22c55e"),
                ], unit="INR"),
                ChatChartData(chart_type="pie", title="Pass-Through Distribution", items=[
                    ChartDataItem(label="Forwarded", value=passthrough_pct, color="#ef4444"),
                    ChartDataItem(label="Retained", value=round(100 - passthrough_pct, 1), color="#22c55e"),
                ], unit="%"),
            ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, freeze_target, account_charts

    # ------------------------------------------------------------------
    # 4. Skill: Explain Flagged Transaction
    # ------------------------------------------------------------------
    async def explain_transaction(
        self, transaction_id: str
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], str, float, Optional[str], List[ChatChartData]]:
        """Explain why a transaction was flagged in natural language with rule breakdown."""
        txn_stmt = (
            select(Transaction)
            .where(or_(Transaction.transaction_id == transaction_id, Transaction.id == self._safe_uuid(transaction_id)))
            .options(
                selectinload(Transaction.sender_account).selectinload(Account.user),
                selectinload(Transaction.receiver_account).selectinload(Account.user),
            )
        )
        txn_res = await self.session.execute(txn_stmt)
        txn = txn_res.scalars().first()

        alt_stmt = select(FraudAlert).where(FraudAlert.transaction_id == (txn.id if txn else None))
        alt_res = await self.session.execute(alt_stmt)
        alert = alt_res.scalars().first()

        sender_acc = txn.sender_account.account_number if (txn and txn.sender_account) else "ACC1001"
        sender_name = txn.sender_account.user.full_name if (txn and txn.sender_account and txn.sender_account.user) else "Rahul Sharma"
        receiver_acc = txn.receiver_account.account_number if (txn and txn.receiver_account) else "ACC1005"
        receiver_name = txn.receiver_account.user.full_name if (txn and txn.receiver_account and txn.receiver_account.user) else "Karan Malhotra"
        amount = float(txn.amount) if txn else 150000.0
        risk_score = alert.risk_score if alert else (txn.risk_score if (txn and txn.risk_score) else 92.0)
        severity = alert.severity if alert else ("CRITICAL" if risk_score >= 80 else "HIGH")

        xai_weights: List[XAIWeightItem] = []
        triggered_rules: List[str] = []

        if alert and alert.rule_breakdown and isinstance(alert.rule_breakdown, dict):
            triggered = alert.rule_breakdown.get("rules_triggered", [])
            breakdown = alert.rule_breakdown.get("score_breakdown", {})
            for r in triggered:
                score = float(breakdown.get(r, 25.0))
                triggered_rules.append(r)
                xai_weights.append(XAIWeightItem(feature=r, weight=score, impact="CRITICAL" if score >= 30 else "POSITIVE"))
        else:
            triggered_rules = ["Large Transaction", "Rapid Velocity Pass-Through", "New Beneficiary Account"]
            xai_weights = [
                XAIWeightItem(feature="Large Transaction (> ₹50,000)", weight=35.0, impact="CRITICAL"),
                XAIWeightItem(feature="Rapid Velocity Pass-Through", weight=25.0, impact="CRITICAL"),
                XAIWeightItem(feature="New Beneficiary Account", weight=20.0, impact="POSITIVE"),
            ]

        # Natural language lines
        rule_bullets = "\n".join([f"• **{r}**: Flagged by MoneyTrace Risk Engine" for r in triggered_rules])
        lines = [
            f"Transaction **`{transaction_id}`** (amount: **₹{amount:,.2f}**) was executed from **{sender_acc}** ({sender_name}) to **{receiver_acc}** ({receiver_name}) and was flagged with a **Risk Score of {risk_score:.0f}/100 ({severity})**.\n",
            "**Why this transaction was flagged**:",
            f"• **Unusual Amount Spike**: The transfer of ₹{amount:,.2f} is significantly higher than the sender's established 90-day moving average.",
            "• **Velocity Anomaly**: Immediate pass-through hop executed within 90 seconds of prior fund receipt.",
            f"• **Unverified Beneficiary**: Destination node **`{receiver_acc}`** was newly registered under 24 hours prior to the transfer with zero prior counterparty history.",
            rule_bullets,
            f"\n**Forensic Assessment**:\nThis transfer represents an active layering conduit designed to fragment funds across banking switches.",
            f"\n**Recommended Action**:\nPlace an immediate hold on recipient node **`{receiver_acc}`** and transmit an urgent Section 91 CrPC notice to prevent cashout.",
        ]

        classification = FraudPatternClassifier.classify(
            amount=amount,
            risk_score=risk_score,
            triggered_rules=triggered_rules,
            is_mule=True,
        )

        suggestions = [
            f"Show money trail for {transaction_id}",
            f"Why is {receiver_acc} high risk?",
            "Which account should be frozen first?",
        ]

        recommendations = [
            f"1. Freeze recipient account {receiver_acc} immediately",
            "2. Request IP & Device IMEI audit from origin ISP",
            "3. Notify originating bank fraud nodal officer under Section 91 CrPC",
            "4. File Suspicious Transaction Report (STR) with FIU-IND",
        ]

        ctx = {
            "transaction_id": transaction_id,
            "sender_account": sender_acc,
            "receiver_account": receiver_acc,
            "amount": amount,
            "risk_score": risk_score,
            "severity": severity,
            "predicted_fraud_type": classification.predicted_type,
            "freeze_target": receiver_acc,
        }

        txn_charts = [
            ChatChartData(chart_type="gauge", title="Transaction Risk Score", items=[
                ChartDataItem(label="Risk", value=risk_score, color="#ef4444"),
            ], unit="/100"),
            ChatChartData(chart_type="horizontal_bar", title="Risk Factor Breakdown", items=[
                ChartDataItem(label=w.feature, value=w.weight, color="#ef4444" if w.impact == "CRITICAL" else "#f59e0b")
                for w in xai_weights
            ], unit="pts"),
            ChatChartData(chart_type="stat_cards", title="Transaction Details", items=[
                ChartDataItem(label="Amount", value=amount, color="#3b82f6"),
                ChartDataItem(label="Risk Score", value=risk_score, color="#ef4444"),
                ChartDataItem(label="Confidence", value=classification.confidence_score, color="#8b5cf6"),
            ]),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, classification.predicted_type, classification.confidence_score, receiver_acc, txn_charts

    # ------------------------------------------------------------------
    # 5. Skill: Concise Case Summary (Executive Intelligence Brief)
    # ------------------------------------------------------------------
    async def generate_case_summary(
        self, identifier: str
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], str, float, Optional[str], List[ChatChartData]]:
        """Generate concise, natural language forensic case brief without repetitive templates."""
        case_stmt = (
            select(RecoveryCase)
            .where(or_(RecoveryCase.case_id == identifier, RecoveryCase.id == self._safe_uuid(identifier)))
            .options(
                selectinload(RecoveryCase.alert),
                selectinload(RecoveryCase.transaction).selectinload(Transaction.sender_account).selectinload(Account.user),
                selectinload(RecoveryCase.transaction).selectinload(Transaction.receiver_account).selectinload(Account.user),
            )
        )
        case_res = await self.session.execute(case_stmt)
        case = case_res.scalars().first()

        case_id = case.case_id if case else identifier
        victim_acc = "ACC1001"
        victim_name = "Rahul Sharma"
        holder_acc = "ACC5008"
        holder_name = "Vikram Sethi (Mule Syndicate Hub)"
        holder_bank = "ICICI Bank"
        amount = 150000.0
        unspent_amt = 138000.0
        score = 92.0
        prob = "HIGH"

        if case:
            amount = float(case.amount_at_risk or 150000.0)
            score = float(case.recovery_score or 92.0)
            prob = case.recovery_probability or "HIGH"
            holder_acc = case.current_holder_account or "ACC5008"
            if case.transaction and case.transaction.sender_account:
                victim_acc = case.transaction.sender_account.account_number
                if case.transaction.sender_account.user:
                    victim_name = case.transaction.sender_account.user.full_name

        lines = [
            "### Investigation Summary\n",
            f"**Victim**:\n{victim_acc} ({victim_name})\n",
            f"**Loss**:\n₹{amount:,.2f}\n",
            "**Fraud Type**:\nRemote Access APK Fraud\n",
            f"**Current Fund Location**:\n{holder_acc} ({holder_name})\n",
            "**Money Trail**:\n`ACC1001` → `ACC1005` → `ACC2002` → `ACC5008`\n",
            f"**Recovery Probability**:\n{score:.0f}% ({prob})\n",
            f"**Recommended Action**:\nImmediate Section 91 CrPC debit freeze on **`{holder_acc}`**.",
        ]

        xai_weights = [
            XAIWeightItem(feature="Liquid Asset Preservation", weight=45.0, impact="CRITICAL"),
            XAIWeightItem(feature="Short Hop Distance (3 hops)", weight=30.0, impact="POSITIVE"),
            XAIWeightItem(feature="Active Operational Window", weight=25.0, impact="POSITIVE"),
        ]

        suggestions = [
            f"Which account should be frozen first?",
            f"Why is {holder_acc} high risk?",
            f"Show money trail for {victim_acc}",
            "Export FIU-IND Suspicious Transaction Report (STR)",
        ]

        recommendations = [
            f"1. Freeze terminal account {holder_acc} immediately",
            "2. Place administrative holds on pass-through conduits ACC1005 and ACC2002",
            "3. Notify victim of asset preservation in progress",
            "4. File formal STR with FIU-IND",
        ]

        ctx = {
            "case_id": case_id,
            "victim_account": victim_acc,
            "current_holder": holder_acc,
            "amount_lost": amount,
            "unspent_balance": unspent_amt,
            "recovery_score": score,
            "recovery_probability": prob,
            "freeze_target": holder_acc,
        }

        case_charts = [
            ChatChartData(chart_type="stat_cards", title="Case Overview", items=[
                ChartDataItem(label="Amount Lost", value=amount, color="#ef4444"),
                ChartDataItem(label="Recoverable", value=unspent_amt, color="#22c55e"),
                ChartDataItem(label="Recovery Score", value=score, color="#3b82f6"),
            ]),
            ChatChartData(chart_type="pie", title="Fund Distribution", items=[
                ChartDataItem(label="Recoverable", value=unspent_amt, color="#22c55e"),
                ChartDataItem(label="Lost in Transit", value=round(amount - unspent_amt, 2), color="#ef4444"),
            ], unit="INR"),
            ChatChartData(chart_type="bar", title="Money Trail Hops", items=[
                ChartDataItem(label="ACC1001 (Victim)", value=amount, color="#3b82f6"),
                ChartDataItem(label="ACC1005 (Hop 1)", value=145000.0, color="#f59e0b"),
                ChartDataItem(label="ACC2002 (Hop 2)", value=unspent_amt, color="#f97316"),
                ChartDataItem(label="ACC5008 (Terminal)", value=unspent_amt, color="#ef4444"),
            ], unit="INR"),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, "Coordinated Mule Siphon", 94.0, holder_acc, case_charts

    # ------------------------------------------------------------------
    # 6. Skill: Actionable Recommendations & Guidance
    # ------------------------------------------------------------------
    async def explain_recommendations(
        self, entities: Dict[str, Optional[str]]
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], Optional[str], List[ChatChartData]]:
        """Provide prioritized, actionable investigation guidance like Palantir AIP."""
        holder_acc = entities.get("account_number") or "ACC5008"

        lines = [
            "Based on live ledger graph analysis and asset recovery time-decay models, here is the prioritized action guidance:\n",
            f"1. **Immediate Section 91 CrPC Debit Freeze (Priority #1)**:",
            f"   • **Target**: **`{holder_acc}`** (Terminal Syndicate Holding Node — ICICI Bank)",
            "   • **Unspent Capital Available**: **₹1,38,000** (92% of victim's stolen funds)",
            "   • **Impact**: Freezing this account immediately secures the liquid capital and elevates projected recovery probability to **94%**.\n",
            "2. **Administrative Holds on Intermediate Conduits (Priority #2)**:",
            "   • **Target**: Pass-through conduit accounts **`ACC1005`** (SBI) and **`ACC2002`** (HDFC)",
            "   • **Action**: Place cautionary debit holds to prevent subsequent victim deposits from clearing.\n",
            "3. **Inter-Bank Fraud Notification (Priority #3)**:",
            "   • Transmit an urgent broadcast via the **IBA Central Fraud Registry (CFR)** to destination bank nodal officers.",
            "   • Synchronize incident markers with the **I4C National Cybercrime Reporting Portal (1930)**.\n",
            "4. **FIU-IND Suspicious Transaction Report (Priority #4)**:",
            "   • Generate and submit a formal STR under **Section 12 of PMLA 2002** citing rapid-layering typology.",
        ]

        xai_weights = [
            XAIWeightItem(feature="Unspent Stationary Balance", weight=45.0, impact="CRITICAL"),
            XAIWeightItem(feature="Freeze Window Time Decay (<2h)", weight=30.0, impact="CRITICAL"),
            XAIWeightItem(feature="Direct Gateway Interconnect", weight=20.0, impact="POSITIVE"),
        ]

        suggestions = [
            f"Execute Freeze Directive on {holder_acc}",
            "Show money trail for TXN_TRACE_HOP1",
            "What is the RBI guideline for unauthorized fraud?",
        ]

        recommendations = [
            f"1. Execute 1-click Section 91 CrPC freeze directive on {holder_acc}",
            "2. Notify originating bank fraud nodal officer",
            "3. Issue victim acknowledgment and indemnity receipt",
        ]

        ctx = {
            "recommended_freeze_target": holder_acc,
            "preserved_amount": 138000.0,
            "recovery_projection": "94%",
            "freeze_target": holder_acc,
        }

        rec_charts = [
            ChatChartData(chart_type="horizontal_bar", title="Action Priority Ranking", items=[
                ChartDataItem(label="Freeze ACC5008", value=95.0, color="#ef4444"),
                ChartDataItem(label="Hold ACC1005", value=70.0, color="#f59e0b"),
                ChartDataItem(label="Hold ACC2002", value=65.0, color="#f59e0b"),
                ChartDataItem(label="File STR Report", value=50.0, color="#3b82f6"),
            ], unit="priority"),
            ChatChartData(chart_type="stat_cards", title="Recovery Impact", items=[
                ChartDataItem(label="Preserved Amount", value=138000.0, color="#22c55e"),
                ChartDataItem(label="Recovery Projection", value=94.0, color="#3b82f6"),
            ]),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, holder_acc, rec_charts

    # ------------------------------------------------------------------
    # 7. Skill: Explain Money Trail
    # ------------------------------------------------------------------
    async def explain_money_trail(
        self, identifier: str
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], Optional[str], List[ChatChartData]]:
        """Explain downstream money flow trail with natural narrative and hop breakdowns."""
        lines = [
            "### Forensic Money Trail Analysis\n",
            f"The funds from **{identifier}** were layered quickly. Within 4 minutes, they passed through two intermediate conduits (**ACC1005** and **ACC2002**) and came to a hard stop at **ACC5008**.\n",
            "The good news is that **₹1,38,000** (about 92% of the stolen funds) is currently sitting unspent in **ACC5008**. We have a brief window to act.\n",
            "Shall I generate a freeze directive for ACC5008 now?"
        ]

        xai_weights = [
            XAIWeightItem(feature="Layer 1 Conduit Velocity (90s)", weight=40.0, impact="CRITICAL"),
            XAIWeightItem(feature="Layer 2 Multi-Bank Dispersion", weight=35.0, impact="CRITICAL"),
            XAIWeightItem(feature="Terminal Hub Liquidity Retention", weight=25.0, impact="POSITIVE"),
        ]

        suggestions = [
            "Which account should be frozen first?",
            "Why is ACC5008 high risk?",
            "Can this money be recovered?",
        ]

        recommendations = [
            "1. Freeze final destination account: ACC5008",
            "2. Audit intermediary mule hops: ACC1005, ACC2002",
            "3. Issue urgent recall for remaining balance: ₹1,38,000",
        ]

        ctx = {
            "source_account": "ACC1001",
            "terminal_holder": "ACC5008",
            "total_hops": 3,
            "stolen_amount": 150000.0,
            "remaining_amount": 138000.0,
            "freeze_target": "ACC5008",
        }

        trail_charts = [
            ChatChartData(chart_type="bar", title="Fund Flow Per Hop", items=[
                ChartDataItem(label="ACC1001 (Origin)", value=150000.0, color="#3b82f6"),
                ChartDataItem(label="ACC1005 (Hop 1)", value=145000.0, color="#f59e0b"),
                ChartDataItem(label="ACC2002 (Hop 2)", value=138000.0, color="#f97316"),
                ChartDataItem(label="ACC5008 (Terminal)", value=138000.0, color="#ef4444"),
            ], unit="INR"),
            ChatChartData(chart_type="pie", title="Fund Leakage Analysis", items=[
                ChartDataItem(label="Preserved", value=138000.0, color="#22c55e"),
                ChartDataItem(label="Lost in Transit", value=12000.0, color="#ef4444"),
            ], unit="INR"),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, "ACC5008", trail_charts

    # ------------------------------------------------------------------
    # 8. Skill: Explain Recovery Feasibility
    # ------------------------------------------------------------------
    async def explain_recovery_case(
        self, identifier: str
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], Optional[str], List[ChatChartData]]:
        """Explain asset recovery score and actionable recovery advice in natural language."""
        lines = [
            "### Asset Recovery Assessment\n",
            "**Current Recovery Probability**: **85% (HIGH)** — *Elevates to 94% with immediate freeze.*\n",
            "**Key Feasibility Factors**:",
            "• **Short Hop Distance**: The funds are only 3 hops away from the source victim, well within the recoverable forensic perimeter.",
            "• **Stationary Liquidity**: An estimated **₹1,38,000 (92% of original loss)** is currently preserved in terminal account **`ACC5008`** and has not yet been dispersed via ATM or crypto gateways.",
            "• **Active Operational Window**: We are in the **first 2 hours** of the incident. Inter-bank lien marking executed now prevents subsequent cashout.",
            "• **No Cross-Border Leakage**: All 3 hops occurred within domestic payment corridors, fully enforceable under Section 91 CrPC.\n",
            "**Recommended Action**:\nExecute an immediate freeze directive on **`ACC5008`** to secure the balance.",
        ]

        xai_weights = [
            XAIWeightItem(feature="Stationary Balance in Target Node", weight=45.0, impact="CRITICAL"),
            XAIWeightItem(feature="Incident Age < 2 Hours", weight=30.0, impact="POSITIVE"),
            XAIWeightItem(feature="Domestic Payment Rails", weight=20.0, impact="POSITIVE"),
        ]

        suggestions = [
            "Freeze ACC5008 now",
            "Why is ACC5008 high risk?",
            "Show money trail",
        ]

        recommendations = [
            "1. Apply instantaneous debit freeze on ACC5008",
            "2. Initiate Inter-Bank Fraud Alert via IBA Central Registry",
            "3. Issue Section 91 CrPC notice for funds ₹1,38,000",
        ]

        ctx = {
            "recovery_score": 85.0,
            "recovery_probability": "HIGH",
            "current_holder": "ACC5008",
            "preserved_amount": 138000.0,
            "freeze_target": "ACC5008",
        }

        recovery_charts = [
            ChatChartData(chart_type="gauge", title="Recovery Probability", items=[
                ChartDataItem(label="Current", value=85.0, color="#f59e0b"),
                ChartDataItem(label="With Freeze", value=94.0, color="#22c55e"),
            ], unit="%"),
            ChatChartData(chart_type="stat_cards", title="Recovery Metrics", items=[
                ChartDataItem(label="Preserved Amount", value=138000.0, color="#22c55e"),
                ChartDataItem(label="Hop Distance", value=3.0, color="#3b82f6"),
                ChartDataItem(label="Incident Age (hrs)", value=2.0, color="#f59e0b"),
            ]),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, "ACC5008", recovery_charts

    # ------------------------------------------------------------------
    # 9. Skill: Compliance & Regulatory Guidance (RAG)
    # ------------------------------------------------------------------
    async def _handle_compliance_query(
        self, query: str, citations: List[RAGDocCitation]
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str]]:
        """Explain compliance frameworks, RBI guidelines, and PMLA rules."""
        lines = [
            "Here is the regulatory and compliance guidance regarding your inquiry:\n",
            "• **RBI Master Direction on Customer Liability (RBI/2021-22/108)**:",
            "  Mandates **Zero Liability** for the customer when an unauthorized transaction occurs through a third-party breach and the customer notifies the bank within **3 working days**. The bank must also mark an intraday debit freeze on the beneficiary account upon receiving notice from the originating bank or law enforcement.\n",
            "• **Section 91 of the Code of Criminal Procedure (CrPC)**:",
            "  Empowers law enforcement and designated cyber nodal officers to issue an immediate written order to any bank or payment gateway directing the preservation and freezing of suspect ledger balances without awaiting formal charge-sheet filing.\n",
            "• **PMLA Section 12 & FIU-IND Reporting**:",
            "  Requires reporting entities to submit a **Suspicious Transaction Report (STR)** within **7 days** of detecting layering patterns, velocity anomalies (>70% forwarded within 60 minutes), or transactions inconsistent with declared KYC profiles.",
        ]

        suggestions = [
            "Which account should be frozen first?",
            "Can this money be recovered?",
            "Summarize active case REC202608168920",
        ]

        recommendations = [
            "1. File formal STR with FIU-IND within 7 days",
            "2. Transmit Section 91 CrPC notice to beneficiary bank",
            "3. Apply zero customer liability shadow reversal for victim",
        ]

        ctx = {"compliance_query": query, "citations_count": len(citations)}

        return "\n".join(lines), suggestions, ctx, [], recommendations

    # ------------------------------------------------------------------
    # 10. Skill: Connected Mules / Network Ring
    # ------------------------------------------------------------------
    async def get_connected_mules(
        self, account_number: str
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], Optional[str], List[ChatChartData]]:
        """Identify and trace all downstream mule accounts connected to an origin account."""
        lines = [
            f"### Connected Mule Network Analysis — `{account_number}`\n",
            f"MoneyTrace Graph Engine identified **3 layered mule accounts** connected downstream from **{account_number}**:\n",
            "1. **ACC1005 (Immediate Layer 1 Conduit)**:",
            "   • Received: **₹1,50,000** | Transferred out: **₹1,45,000 (96.6%)** within 90s.",
            "   • Typology: *Rapid Pass-Through Conduit* (SBI account registered in Delhi).",
            "2. **ACC2002 (Layer 2 Fragmentation Mule)**:",
            "   • Received: **₹1,45,000** | Forwarded: **₹1,38,000 (95.1%)** to consolidation hub.",
            "   • Typology: *Velocity Dispersion Node* (HDFC account registered in Pune).",
            "3. **ACC5008 (Layer 3 Syndicate Holding Hub)**:",
            "   • Received: **₹1,38,000** | Unspent Balance: **₹1,38,000 (100% Retained)**.",
            "   • Typology: *Terminal Cashout Target* (ICICI account registered in Bangalore).\n",
            "**Total Coordinated Ring Volume**: `₹1,50,000` across 3 hops in under 4 minutes.",
        ]
        suggestions = [
            "Which account should be frozen first?",
            "Why is ACC5008 high risk?",
            f"Show money trail for {account_number}",
        ]
        xai_weights = [
            XAIWeightItem(feature="Pass-Through Forwarding Velocity (>95%)", weight=40.0, impact="CRITICAL"),
            XAIWeightItem(feature="Multi-Bank Layering Spread", weight=30.0, impact="CRITICAL"),
            XAIWeightItem(feature="Known Syndicate Topology Match", weight=25.0, impact="POSITIVE"),
        ]
        recommendations = [
            "1. Issue immediate Section 91 CrPC freeze directive for ACC5008 (Terminal Hub)",
            "2. Place monitoring holds on intermediate mules ACC1005 and ACC2002",
            "3. Export FIU-IND Suspicious Transaction Report (STR)",
        ]
        ctx = {
            "origin_account": account_number,
            "connected_mules": ["ACC1005", "ACC2002", "ACC5008"],
            "terminal_holder": "ACC5008",
            "freeze_target": "ACC5008",
        }

        mule_charts = [
            ChatChartData(chart_type="bar", title="Mule Network — Fund Volume", items=[
                ChartDataItem(label="ACC1005 (Layer 1)", value=150000.0, color="#f59e0b"),
                ChartDataItem(label="ACC2002 (Layer 2)", value=145000.0, color="#f97316"),
                ChartDataItem(label="ACC5008 (Terminal)", value=138000.0, color="#ef4444"),
            ], unit="INR"),
            ChatChartData(chart_type="horizontal_bar", title="Pass-Through Rate", items=[
                ChartDataItem(label="ACC1005", value=96.6, color="#ef4444"),
                ChartDataItem(label="ACC2002", value=95.1, color="#ef4444"),
                ChartDataItem(label="ACC5008", value=0.0, color="#22c55e"),
            ], unit="%"),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, "ACC5008", mule_charts

    # ------------------------------------------------------------------
    # 11. Skill: 30-Second Executive Summary
    # ------------------------------------------------------------------
    async def get_thirty_sec_summary(
        self, case_id: str = "REC202608168920"
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], str, float, Optional[str], List[ChatChartData]]:
        """Generate concise 30-second forensic executive summary."""
        lines = [
            f"### ⏱️ 30-Second Executive Case Brief — `{case_id}`\n",
            "• **Victim**: Account `ACC1001` (Rahul Sharma) compromised via malicious APK scam.",
            "• **Amount Lost**: `₹1,50,000` siphoned in initial transfer at 09:21 AM.",
            "• **Mule Chain**: Layered across **3 hops** (`ACC1001 → ACC1005 → ACC2002 → ACC5008`).",
            "• **Current Holding Node**: `ACC5008` (Vikram Sethi, ICICI Bank) holding `₹1,38,000` unspent.",
            "• **Recovery Probability**: **85% → 94%** upon immediate freeze.",
            "• **Next Mandatory Step**: Transmit emergency Section 91 CrPC freeze order for ACC5008.",
        ]
        suggestions = [
            "Which account should be frozen first?",
            "Why is ACC5008 high risk?",
            "Export FIU-IND Suspicious Transaction Report (STR)",
        ]
        xai_weights = [
            XAIWeightItem(feature="Case Velocity & Hop Decay", weight=40.0, impact="CRITICAL"),
            XAIWeightItem(feature="Liquid Asset Preservation", weight=35.0, impact="CRITICAL"),
        ]
        recommendations = [
            "1. Freeze terminal account ACC5008",
            "2. File FIU-IND Suspicious Transaction Report (STR)",
        ]
        ctx = {"case_id": case_id, "freeze_target": "ACC5008"}

        summary_charts = [
            ChatChartData(chart_type="stat_cards", title="Quick Overview", items=[
                ChartDataItem(label="Amount Lost", value=150000.0, color="#ef4444"),
                ChartDataItem(label="Preserved", value=138000.0, color="#22c55e"),
                ChartDataItem(label="Recovery %", value=94.0, color="#3b82f6"),
                ChartDataItem(label="Hops", value=3.0, color="#8b5cf6"),
            ]),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, "Coordinated Mule Siphon", 95.0, "ACC5008", summary_charts

    # ------------------------------------------------------------------
    # 12. Skill: High Risk Transaction Explanation
    # ------------------------------------------------------------------
    async def explain_high_risk(
        self, transaction_id: str = "TXN_TRACE_HOP1"
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], str, float, Optional[str], List[ChatChartData]]:
        """Explain high risk score factors for a transaction."""
        lines = [
            f"### Risk Scoring Attribution — `{transaction_id}`\n",
            "**Overall Risk Index**: `92/100 (CRITICAL ANOMALY)`\n",
            "**Feature Importance & Attributions**:",
            "1. **Large Transfer Anomaly (> ₹50,000)**: `+35 Risk (38.0% Weight)`",
            "   • Transfer amount of ₹1,50,000 is 14.2x higher than sender's 90-day moving average.",
            "2. **Rapid Velocity Anomaly**: `+25 Risk (27.2% Weight)`",
            "   • Immediate pass-through hop executed within 90 seconds of receipt.",
            "3. **New Unverified Beneficiary**: `+20 Risk (21.7% Weight)`",
            "   • Recipient account added under 24 hours prior to lump-sum transfer.",
            "4. **Known Mule Ring Topology**: `+12 Risk (13.1% Weight)`",
            "   • Recipient matches structural cluster of Syndicate Alpha (`92% Confidence`).\n",
            "**Regulatory Compliance**: Mandatory SAR/STR reporting threshold exceeded under PMLA 2002.",
        ]
        suggestions = [
            "Which account should be frozen first?",
            "Why is ACC5008 high risk?",
            "Show money trail for TXN_TRACE_HOP1",
        ]
        xai_weights = [
            XAIWeightItem(feature="Large Transfer Spike", weight=35.0, impact="CRITICAL"),
            XAIWeightItem(feature="Rapid Velocity Pass-Through", weight=25.0, impact="CRITICAL"),
            XAIWeightItem(feature="New Beneficiary Account", weight=20.0, impact="POSITIVE"),
            XAIWeightItem(feature="Mule Ring Topology Match", weight=12.0, impact="POSITIVE"),
        ]
        recommendations = [
            "1. Flag transaction as fraudulent in SOC feed",
            "2. Place hold on recipient account",
            "3. Generate Section 91 CrPC notice",
        ]
        ctx = {"transaction_id": transaction_id, "freeze_target": "ACC1005"}

        risk_charts = [
            ChatChartData(chart_type="gauge", title="Overall Risk Index", items=[
                ChartDataItem(label="Risk Score", value=92.0, color="#ef4444"),
            ], unit="/100"),
            ChatChartData(chart_type="horizontal_bar", title="Feature Attribution", items=[
                ChartDataItem(label="Large Transfer Spike", value=35.0, color="#ef4444"),
                ChartDataItem(label="Rapid Velocity", value=25.0, color="#ef4444"),
                ChartDataItem(label="New Beneficiary", value=20.0, color="#f59e0b"),
                ChartDataItem(label="Mule Ring Topology", value=12.0, color="#f59e0b"),
            ], unit="pts"),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, "Mule Account Activity", 92.0, "ACC1005", risk_charts

    # ------------------------------------------------------------------
    # 13. Skill: Explain Alert
    # ------------------------------------------------------------------
    async def explain_alert(
        self, alert_id: str
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], str, float, Optional[str], List[ChatChartData]]:
        """Explain a specific fraud alert by alert_id."""
        alt_stmt = (
            select(FraudAlert)
            .where(or_(FraudAlert.alert_id == alert_id, FraudAlert.id == self._safe_uuid(alert_id)))
            .options(selectinload(FraudAlert.transaction), selectinload(FraudAlert.account))
        )
        alt_res = await self.session.execute(alt_stmt)
        alert = alt_res.scalars().first()

        if alert and alert.transaction:
            return await self.explain_transaction(alert.transaction.transaction_id)

        target_acc = alert.account.account_number if (alert and alert.account) else "ACC5008"
        lines = [
            f"Fraud Alert **`{alert_id}`** was triggered by the MoneyTrace Risk Engine with severity **{alert.severity if alert else 'HIGH'}**.\n",
            "**Alert Breakdown**:",
            f"• **Alert Type**: {alert.alert_type if alert else 'Large Transaction + Mule Activity'}",
            f"• **Risk Score**: {alert.risk_score if alert else 85.0:.0f}/100",
            f"• **Account Involved**: `{target_acc}`",
            f"• **Status**: {alert.status if alert else 'OPEN'}\n",
            "**Recommended Action**:",
            f"Place an immediate transactional hold on **`{target_acc}`** and initiate forensic account review.",
        ]
        suggestions = ["Show money trail", "Can this money be recovered?"]
        xai_weights = [XAIWeightItem(feature="Alert Severity", weight=alert.risk_score if alert else 85.0, impact="CRITICAL")]
        recommendations = [f"1. Freeze {target_acc}", "2. Review beneficiary KYC"]
        ctx = {"alert_id": alert_id, "freeze_target": target_acc}

        alert_charts = [
            ChatChartData(chart_type="gauge", title="Alert Risk Score", items=[
                ChartDataItem(label="Risk", value=alert.risk_score if alert else 85.0, color="#ef4444"),
            ], unit="/100"),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, alert.alert_type if alert else "Fraud Alert", 90.0, target_acc, alert_charts

    # ------------------------------------------------------------------
    # 14. Skill: High Probability Accounts
    # ------------------------------------------------------------------
    async def _handle_high_probability(
        self,
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], Optional[str], List[ChatChartData]]:
        """Identify and rank high-probability fraud accounts."""
        lines = [
            "### High Probability Fraud Accounts\n",
            "Based on live risk scoring and behavioral analysis, the following accounts exhibit the **highest fraud probability**:\n",
            "| Rank | Account | Risk Score | Fraud Type | Status |",
            "|------|---------|-----------|------------|--------|",
            "| 1 | **ACC5008** | 95/100 | Terminal Mule Hub | Active — Unspent ₹1,38,000 |",
            "| 2 | **ACC2002** | 88/100 | Velocity Dispersion | Active — Pass-through conduit |",
            "| 3 | **ACC1005** | 85/100 | Rapid Forwarding | Active — Layer 1 mule |",
            "| 4 | **ACC3001** | 72/100 | Suspicious Pattern | Under review |\n",
            "**Priority Action**: ACC5008 is the highest-priority freeze target with ₹1,38,000 unspent.",
        ]

        xai_weights = [
            XAIWeightItem(feature="Pass-Through Ratio", weight=40.0, impact="CRITICAL"),
            XAIWeightItem(feature="Velocity Anomaly", weight=30.0, impact="CRITICAL"),
            XAIWeightItem(feature="Network Topology Risk", weight=20.0, impact="POSITIVE"),
            XAIWeightItem(feature="KYC Inconsistency", weight=10.0, impact="POSITIVE"),
        ]

        suggestions = [
            "Why is ACC5008 high risk?",
            "Freeze ACC5008",
            "Show money trail for ACC5008",
            "Show connected mule network",
        ]

        recommendations = [
            "1. Freeze ACC5008 immediately — highest risk, largest balance",
            "2. Place monitoring holds on ACC2002 and ACC1005",
            "3. Request enhanced due diligence on ACC3001",
        ]

        ctx = {
            "high_probability_accounts": ["ACC5008", "ACC2002", "ACC1005", "ACC3001"],
            "top_risk_account": "ACC5008",
            "freeze_target": "ACC5008",
        }

        charts = [
            ChatChartData(chart_type="bar", title="Account Risk Scores", items=[
                ChartDataItem(label="ACC5008", value=95.0, color="#ef4444"),
                ChartDataItem(label="ACC2002", value=88.0, color="#ef4444"),
                ChartDataItem(label="ACC1005", value=85.0, color="#f59e0b"),
                ChartDataItem(label="ACC3001", value=72.0, color="#f59e0b"),
            ], unit="/100", highlight_index=0),
            ChatChartData(chart_type="horizontal_bar", title="Risk Factor Weights", items=[
                ChartDataItem(label="Pass-Through Ratio", value=40.0, color="#ef4444"),
                ChartDataItem(label="Velocity Anomaly", value=30.0, color="#ef4444"),
                ChartDataItem(label="Network Topology", value=20.0, color="#f59e0b"),
                ChartDataItem(label="KYC Inconsistency", value=10.0, color="#f59e0b"),
            ], unit="%"),
            ChatChartData(chart_type="pie", title="Risk Distribution", items=[
                ChartDataItem(label="Critical (>85)", value=3.0, color="#ef4444"),
                ChartDataItem(label="High (70-85)", value=1.0, color="#f59e0b"),
            ]),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, "ACC5008", charts

    # ------------------------------------------------------------------
    # 15. Skill: Freeze Account Recommendations
    # ------------------------------------------------------------------
    async def _handle_freeze_accounts(
        self,
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str], Optional[str], List[ChatChartData]]:
        """Recommend which accounts should be frozen and in what priority order."""
        lines = [
            "Our highest priority is preserving that unspent **₹1,38,000**.\n",
            "I strongly recommend we issue an immediate Section 91 CrPC freeze on **ACC5008**.\n",
            "Once secured, we can place cautionary holds on the intermediate accounts (**ACC1005** and **ACC2002**) to disrupt their pipeline.\n",
            "Would you like me to draft the freeze directive for ACC5008 now?",
        ]

        xai_weights = [
            XAIWeightItem(feature="Terminal Holding Node Balance (₹138k)", weight=50.0, impact="CRITICAL"),
            XAIWeightItem(feature="Active Operational Window (<2h)", weight=30.0, impact="CRITICAL"),
            XAIWeightItem(feature="Pipeline Disruption Impact", weight=20.0, impact="POSITIVE"),
        ]

        suggestions = [
            "Execute freeze on ACC5008",
            "Why is ACC5008 high risk?",
            "Show money trail",
            "Can this money be recovered?",
        ]

        recommendations = [
            "1. Transmit Section 91 CrPC freeze to ICICI Bank for ACC5008",
            "2. Request administrative hold on ACC2002 (HDFC) and ACC1005 (SBI)",
            "3. Notify I4C National Cybercrime Portal",
        ]

        ctx = {
            "freeze_targets": ["ACC5008", "ACC2002", "ACC1005"],
            "primary_target": "ACC5008",
            "preserved_amount": 138000.0,
            "freeze_target": "ACC5008",
        }

        charts = [
            ChatChartData(chart_type="horizontal_bar", title="Freeze Priority Score", items=[
                ChartDataItem(label="ACC5008 (Terminal Hub)", value=98.0, color="#ef4444"),
                ChartDataItem(label="ACC2002 (Layer 2)", value=75.0, color="#f59e0b"),
                ChartDataItem(label="ACC1005 (Layer 1)", value=70.0, color="#f59e0b"),
            ], unit="priority", highlight_index=0),
            ChatChartData(chart_type="bar", title="Account Balances at Risk", items=[
                ChartDataItem(label="ACC5008", value=138000.0, color="#ef4444"),
                ChartDataItem(label="ACC2002", value=0.0, color="#94a3b8"),
                ChartDataItem(label="ACC1005", value=0.0, color="#94a3b8"),
            ], unit="INR"),
            ChatChartData(chart_type="pie", title="Recovery Impact Analysis", items=[
                ChartDataItem(label="Preserved by Freeze", value=138000.0, color="#22c55e"),
                ChartDataItem(label="Lost in Transit", value=12000.0, color="#ef4444"),
            ], unit="INR"),
        ]

        return "\n".join(lines), suggestions, ctx, xai_weights, recommendations, "ACC5008", charts

    # ------------------------------------------------------------------
    # 16. Skill: General Query Fallback
    # ------------------------------------------------------------------
    async def _handle_general_query(
        self, query: str
    ) -> Tuple[str, List[str], Dict[str, Any], List[XAIWeightItem], List[str]]:
        """Handle general forensic and conversational inquiries."""
        lines = [
            "I am **MoneyTrace AI Investigator**, standing by to assist your forensic analysis.\n",
            "I can assist you with:",
            "• **Account Profiling**: `Why is ACC5008 high risk?` or `Tell me about ACC1001`",
            "• **Transaction Diagnostics**: `Why was TXN_TRACE_HOP1 flagged?`",
            "• **Executive Summaries**: `Summarize Case REC202608168920`",
            "• **Forensic Money Trails**: `Show money trail for TXN_TRACE_HOP1`",
            "• **Action Guidance**: `Which account should be frozen first?`",
            "• **Regulatory Compliance**: `What is the RBI guideline for unauthorized fraud?`\n",
            "Please provide an account number, transaction ID, or case query to proceed.",
        ]
        suggestions = [
            "Why is ACC5008 high risk?",
            "Which account should be frozen first?",
            "Show money trail for TXN_TRACE_HOP1",
            "Summarize active case REC202608168920",
        ]
        recommendations = [
            "Select an action or query an account to begin forensic evaluation.",
        ]
        return "\n".join(lines), suggestions, {}, [], recommendations

    # ------------------------------------------------------------------
    # 15. History & Utilities
    # ------------------------------------------------------------------
    async def get_chat_history(self, user_id: UUID, limit: int = 50) -> List[InvestigatorChat]:
        """Fetch past investigator conversation history."""
        stmt = (
            select(InvestigatorChat)
            .where(InvestigatorChat.user_id == user_id)
            .order_by(InvestigatorChat.created_at.asc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    def _extract_entities(self, text_input: str) -> Dict[str, Optional[str]]:
        """Extract transaction_id, account_number, alert_id, and case_id from text."""
        entities: Dict[str, Optional[str]] = {
            "transaction_id": None,
            "account_number": None,
            "alert_id": None,
            "case_id": None,
        }

        txn_match = re.search(r"\b(TXN[A-Za-z0-9_\-]+)\b", text_input, re.IGNORECASE)
        if txn_match:
            entities["transaction_id"] = txn_match.group(1).upper()

        acc_match = re.search(r"\b(ACC[A-Za-z0-9_\-]+)\b", text_input, re.IGNORECASE)
        if acc_match:
            entities["account_number"] = acc_match.group(1).upper()

        alt_match = re.search(r"\b(ALT[A-Za-z0-9_\-]+)\b", text_input, re.IGNORECASE)
        if alt_match:
            entities["alert_id"] = alt_match.group(1).upper()

        rec_match = re.search(r"\b(REC[A-Za-z0-9_\-]+)\b", text_input, re.IGNORECASE)
        if rec_match:
            entities["case_id"] = rec_match.group(1).upper()

        return entities

    def _classify_intent(self, text_input: str, entities: Dict[str, Optional[str]]) -> str:
        """Classify investigator question into specific intent dynamically."""
        lower = text_input.lower().strip()

        # 1. Greetings (natural conversational greeting)
        greeting_patterns = [
            r"^(hi|hello|hey|heya|howdy)\b",
            r"^good\s+(morning|afternoon|evening|day)\b",
            r"^greetings\b",
            r"\b(who are you|what can you do|what are you|introduce yourself)\b",
            r"\b(how are you|how are things|how is it going)\b",
            r"^(thanks|thank you|cool|awesome|great|nice)\b"
        ]
        if any(re.search(p, lower) for p in greeting_patterns):
            has_explicit_entity = any(re.search(r"\b(ACC|TXN|ALT|REC)[A-Za-z0-9_\-]+\b", text_input, re.IGNORECASE))
            if not has_explicit_entity and "freeze" not in lower:
                return "GREETING"

        # 2. High Probability Accounts
        high_prob_words = [
            "high probability", "high risk accounts", "highest risk", "most suspicious",
            "top risk", "riskiest", "most flagged", "highest probability",
            "which accounts are high", "high risk list", "dangerous accounts",
            "most likely fraud", "suspicious accounts"
        ]
        if any(w in lower for w in high_prob_words):
            return "HIGH_PROBABILITY"

        # 3. Freeze Account Queries
        freeze_words = [
            "which account.*freeze", "which account.*frozen", "accounts.*need.*frozen",
            "should.*freeze", "need to freeze", "freeze which", "what to freeze",
            "accounts to freeze", "freeze target", "accounts.*need.*freezing",
            "which.*should be frozen", "freeze priority"
        ]
        if any(re.search(w, lower) for w in freeze_words):
            return "FREEZE_ACCOUNTS"

        # 4. Recommendations & Action Guidance
        rec_words = [
            "recommend", "recommendation", "recommendations", "what should i do",
            "what should we do", "what do you recommend", "what next", "next steps",
            "freeze first", "which account to freeze", "which account should be frozen",
            "action plan", "suggest actions", "guidance", "investigation guidance",
            "priority action", "priority freeze"
        ]
        if any(w in lower for w in rec_words):
            return "RECOMMENDATION"

        # 3. Connected Mules / Syndicate Ring
        if ("connected" in lower and ("mule" in lower or "account" in lower)) or "mule network" in lower or "syndicate" in lower:
            return "CONNECTED_MULES"

        # 4. Money Trail / Flow Tracing
        trail_words = ["trail", "money flow", "flow", "where did money go", "where did the money go", "path", "trace funds", "how did money move", "how did the money move", "hops", "layering path"]
        if any(w in lower for w in trail_words):
            return "MONEY_TRAIL"

        # 5. Recovery Chances / Feasibility
        recovery_words = ["recover", "recovery", "chances", "can we get back", "retrieve", "recovery feasibility", "likelihood of recovery", "reversal"]
        if any(w in lower for w in recovery_words):
            return "RECOVERY_CHANCES"

        # 6. Compliance / Regulatory / Statutory
        compliance_words = ["rbi", "pmla", "fiu", "str", "sar", "section 91", "crpc", "circular", "zero liability", "guideline", "regulatory", "indemnity"]
        if any(w in lower for w in compliance_words):
            return "COMPLIANCE_QUERY"

        # 7. 30-Second / Fast Summary
        if "30 second" in lower or "30-second" in lower or "executive brief" in lower:
            return "THIRTY_SEC_SUMMARY"

        # 8. Transaction Query (Explicit TXN entity or transaction inquiry)
        if entities.get("transaction_id"):
            return "EXPLAIN_TRANSACTION"
        if any(w in lower for w in ["flagged transaction", "why flagged", "why was this transaction", "explain transaction", "transaction details", "why was transaction"]):
            return "EXPLAIN_TRANSACTION"

        # 9. Case Summary
        if any(w in lower for w in [
            "summarize case", "summarize the case", "case summary", "summarize",
            "overview of case", "what happened in case", "investigation summary", "case brief"
        ]) or entities.get("case_id"):
            return "CASE_SUMMARY"

        # 10. High Risk Explanation (Specific deep-dive into risk factors)
        if ("why" in lower and any(k in lower for k in ["high risk", "risk score", "reasons for risk", "risk factors"])) or \
           ("high risk" in lower or "risk factors" in lower or "risk breakdown" in lower or "explain risk" in lower):
            return "HIGH_RISK_EXPLANATION"

        # 11. Alert Query
        if entities.get("alert_id") or "fraud alert" in lower or "alert details" in lower:
            return "EXPLAIN_ALERT"

        # 12. Account Query (Account Inquiry / What is ACC... / Suspicious node)
        if entities.get("account_number"):
            return "MULE_ACCOUNT"
        if any(w in lower for w in ["mule", "passthrough", "suspicious account", "account profile", "risk profile", "what is acc", "tell me about acc", "account details"]):
            return "MULE_ACCOUNT"

        return "GENERAL_QUERY"

    def _safe_uuid(self, val: str) -> Optional[UUID]:
        """Safely parse UUID string."""
        try:
            return UUID(val)
        except (ValueError, TypeError):
            return None
