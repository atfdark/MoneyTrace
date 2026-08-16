# MoneyTrace End-to-End Data Flow & Sequence Diagrams

This document details the exact sequence of events, data transformations, and state transitions across the MoneyTrace lifecycle.

---

## 1. End-to-End Transaction & Fraud Detection Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Banking User / Simulator
    participant API as FastAPI Gateway
    participant Auth as Auth & RBAC
    participant TxnService as Transaction Service
    participant FraudEng as Fraud Detection Engine (8 Rules)
    participant GraphEng as NetworkX Graph Engine
    participant RecEng as Recovery Engine
    participant DB as SQLite (moneytrace.db)

    User->>API: POST /api/v1/transactions (sender, receiver, amount)
    API->>Auth: Validate JWT Token
    Auth-->>API: Authorized User Context
    API->>TxnService: Process Transfer
    TxnService->>DB: Check Sender Balance & Receiver Status
    DB-->>TxnService: Balance OK (e.g. ₹200,000.00)

    TxnService->>FraudEng: Evaluate Behavioral Fraud Rules
    Note over FraudEng: 1. Large Transaction (+30)<br/>2. Rapid Velocity (+25)<br/>3. Impossible Travel (+20)<br/>4. Device Change (+15)<br/>5. Mule Forwarding (+40)
    FraudEng-->>TxnService: Risk Score: 85 (CRITICAL), Triggered: [Large, Velocity]

    alt Risk Score >= 60 (Fraud Detected)
        TxnService->>DB: Insert Transaction (is_flagged=True, risk=85)
        TxnService->>DB: Insert FraudAlert (status='OPEN', severity='CRITICAL')
        TxnService->>GraphEng: Ingest Directed Edge (Node A -> Node B)
        TxnService->>RecEng: Evaluate Asset Recovery Feasibility
        RecEng-->>TxnService: Recovery Score: 85 (HIGH), Action: 'Freeze Holder'
        TxnService->>DB: Insert RecoveryCase (status='OPEN')
    else Low Risk (< 60)
        TxnService->>DB: Insert Transaction (is_flagged=False, risk=15)
    end

    TxnService->>DB: Atomically Update Account Balances
    DB-->>TxnService: Commit OK
    TxnService-->>API: Transaction Response + Fraud Alert Summary
    API-->>User: 201 Created (Transaction Details & Flag Status)
```

---

## 2. Money Flow Graph Traversal & Cycle Detection Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Investigator as SOC Investigator
    participant API as FastAPI Gateway
    participant GraphRouter as Graph Endpoint (/trace/{id})
    participant GraphEng as NetworkX Graph Engine
    participant DB as SQLite (moneytrace.db)

    Investigator->>API: GET /api/v1/graph/trace/TXN_TRACE_HOP1
    API->>GraphRouter: Route Request
    GraphRouter->>DB: Fetch Transaction History & Multi-Hop Ledger
    DB-->>GraphRouter: Transaction Edges
    GraphRouter->>GraphEng: Build MultiDiGraph(Transactions)
    GraphEng->>GraphEng: Traverse Downstream Transfer Paths (BFS/DFS)
    GraphEng->>GraphEng: Detect Cycles & Calculate Remaining Balance
    GraphEng-->>GraphRouter: MoneyTraceResponse (Victim -> Mule 1 -> Mule 2 -> Holder)
    GraphRouter-->>API: 200 OK (money_path, total_hops, current_holder)
    API-->>Investigator: Display Multi-Hop Visual Flow Chart
```

---

## 3. AI Copilot Forensic Intelligence Query Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Investigator as SOC Investigator
    participant UI as React AI Copilot (/chat)
    participant AssistantAPI as Assistant Router (/assistant/chat)
    participant AIOrchestrator as AI Investigator Assistant
    participant RAG as RAG Compliance Knowledge
    participant ML as ML Typology Classifier
    participant Sim as Case Similarity Matcher
    participant DB as SQLite (moneytrace.db)

    Investigator->>UI: Types: "Why was transaction TXN_TRACE_HOP1 flagged?"
    UI->>AssistantAPI: POST /api/v1/assistant/chat (message, context_id)
    AssistantAPI->>AIOrchestrator: Process Prompt
    AIOrchestrator->>AIOrchestrator: Extract Entities (TXN_TRACE_HOP1) & Intent (EXPLAIN_TRANSACTION)

    par Parallel Intelligence Gathering
        AIOrchestrator->>RAG: Search RBI Circulars & PMLA Section 12
        RAG-->>AIOrchestrator: RAG Citations (RBI/2021-22/108, FIU-IND STR)
    and
        AIOrchestrator->>ML: Predict Typology (Amount, Rules, Velocity)
        ML-->>AIOrchestrator: "Mule Account Activity" (88.5% Confidence)
    and
        AIOrchestrator->>Sim: Find Precedent Cases (Cosine Distance)
        Sim-->>AIOrchestrator: Top Matches (REC012: 92.5%, REC034: 88%)
    and
        AIOrchestrator->>DB: Fetch Alert & Transaction Rule Breakdown
        DB-->>AIOrchestrator: Rule Contributions (+50 Large, +25 Velocity)
    end

    AIOrchestrator->>AIOrchestrator: Compute Explainable AI (XAI) Feature Importance Bars
    AIOrchestrator->>AIOrchestrator: Assemble Actionable Next-Steps Checklist
    AIOrchestrator->>DB: Persist InvestigatorChat Log
    AIOrchestrator-->>AssistantAPI: ChatResponse DTO
    AssistantAPI-->>UI: 200 OK (Answer, XAI Bars, Citations, Similar Cases)
    UI-->>Investigator: Render Markdown Stream & Forensic Intelligence Widgets
```

---

## 4. Multi-Format Report & Export Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Investigator / Admin
    participant UI as Reports Center (/reports)
    participant RepAPI as Reports Router (/reports/investigation/{id}/pdf)
    participant RepGen as Report Generator Service
    participant Matplotlib as Matplotlib Chart Engine
    participant ReportLab as ReportLab Document Builder
    participant LocalStorage as Local Storage (storage/reports/pdf/)
    participant DB as SQLite (moneytrace.db)

    User->>UI: Click "Download PDF" for Case REC202608168920
    UI->>RepAPI: GET /api/v1/reports/investigation/REC202608168920/pdf
    RepAPI->>RepGen: generate_investigation_pdf("REC202608168920")
    RepGen->>DB: Fetch RecoveryCase, Alert, Transaction & Money Trail
    DB-->>RepGen: Case Data Payload

    RepGen->>Matplotlib: Render Recovery Probability Bar Chart
    Matplotlib-->>RepGen: Saved storage/reports/charts/recovery_prob.png

    RepGen->>ReportLab: Build SimpleDocTemplate with Tables, Header, Legal Box & Chart
    ReportLab->>LocalStorage: Write storage/reports/pdf/MoneyTrace_Investigation_REC202608168920.pdf
    LocalStorage-->>RepGen: File Path Verified
    RepGen-->>RepAPI: FileResponse(path, media_type='application/pdf')
    RepAPI-->>UI: 200 OK (Binary PDF Stream)
    UI-->>User: Browser triggers download of official PDF dossier
```
