# MoneyTrace System Architecture & Layer Specifications

MoneyTrace is an offline-capable, enterprise-grade **Financial Crime Intelligence Platform** that unites real-time transaction processing, behavioral fraud detection, NetworkX graph flow analysis, asset recovery intelligence, forensic AI reasoning, and multi-format report generation.

---

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Client Layer [Frontend Client - React 18 + Vite + Tailwind]
        UI_Dash[Executive SOC Dashboard]
        UI_Txn[Live Banking Simulator]
        UI_Alert[Fraud Alert Center]
        UI_Graph[Money Flow Visualizer]
        UI_Rec[Asset Recovery Center]
        UI_Chat[AI Forensic Copilot Pro]
        UI_Rep[Reports & Export Center]
    end

    subgraph Gateway & API Layer [FastAPI 0.115+]
        Router[API Gateway /api/v1]
        AuthGuard[JWT Auth Guard & RBAC]
        CORSMiddleware[CORS Middleware]
        ErrorHandler[AppException Global Handler]
    end

    subgraph Service & Intelligence Layer [Python 3.10+]
        FraudEngine[Fraud Detection Engine<br/>8 Behavioral Rules]
        GraphEngine[NetworkX Graph Engine<br/>Cycle & Hop Detection]
        RecoveryEngine[Recovery Intelligence<br/>Preservation Math]
        DashboardService[Dashboard Analytics<br/>Composite Risk & Trends]
        AICopilot[AI Investigator Assistant<br/>NLU & XAI Attributions]
        RAGService[RAG Compliance Engine<br/>RBI & PMLA Knowledge]
        MLClassifier[ML Typology Classifier<br/>Scikit-Learn Pattern Matcher]
        ReportGen[Report & Export Generator<br/>PDF, DOCX, CSV, XLSX]
    end

    subgraph Persistence Layer [Async SQLite / PostgreSQL]
        DB[(moneytrace.db<br/>SQLAlchemy Async Engine)]
        LocalStorage[storage/reports/<br/>PDF, DOCX, CSV, XLSX, Charts]
    end

    Client Layer --> Router
    Router --> AuthGuard
    AuthGuard --> Service & Intelligence Layer
    Service & Intelligence Layer --> DB
    ReportGen --> LocalStorage
```

---

## 2. Architectural Layers

### Layer 1: Presentation (React + TypeScript)
- Built with React 18 and Vite for near-instant HMR.
- Uses TanStack React Query for declarative caching, background refetching, and optimistic updates.
- Tailwind CSS with a curated financial crime dark-mode design system.

### Layer 2: API Gateway & Security (FastAPI)
- Asynchronous ASGI application with full OpenAPI / Swagger documentation.
- Stateless authentication using HMAC-SHA256 JWT tokens.
- Role-Based Access Control (`ADMIN`, `INVESTIGATOR`, `ANALYST`, `CUSTOMER`).

### Layer 3: Intelligence & Forensic Core
1. **Deterministic & Behavioral Fraud Scoring**: Calculates weighted risk contributions across amount, velocity, location, device, and mule metrics.
2. **Network Graph Analysis (NetworkX)**: Directed graph traversal calculating shortest paths, multi-hop money flow trees, and circular laundering cycles ($O(V+E)$).
3. **Asset Recovery Engine**: Evaluates asset preservation probability (0–100) based on downstream hop depth, node operational status, and velocity dispersion.
4. **AI Investigator Copilot**: Offline natural language reasoning combining RAG compliance search, Explainable AI (XAI) feature attribution, and precedent case similarity matching.
5. **Report Generation Engine**: Compiles court-admissible PDF dossiers (`reportlab`), editable Word briefs (`python-docx`), multi-sheet workbooks (`openpyxl`), and raw CSV streams.

### Layer 4: Persistence
- Fully asynchronous ORM using `SQLAlchemy 2.0` with `aiosqlite`.
- SQLite database (`moneytrace.db`) with zero external database dependencies for offline evaluation.

---

## 3. Core Operational Flows

### A. Transaction & Real-Time Fraud Flow
```text
1. Transaction Initiated (POST /transactions)
2. Balance & Account Status Verification
3. FraudRulesEngine evaluates 8 rules in parallel
4. Composite Risk Score calculated (0 - 100)
5. If Risk Score >= 60:
   ├── Mark Transaction as is_flagged = True
   ├── Create FraudAlert record with JSON rule_breakdown
   └── Trigger Graph & Recovery Engine ingestion
6. Atomic Ledger Update & Balance Transfer
7. Return Transaction & Fraud Risk Payload
```

### B. Money Flow Graph Analysis Flow
```text
1. GraphEngine loads transactions into NetworkX MultiDiGraph
2. Node = Account Number | Edge = Directed Transaction (amount, timestamp, txn_id)
3. Trace Request (/graph/trace/{id}):
   ├── Find transaction origin node
   ├── Perform BFS / DFS traversal following outbound transfers
   ├── Calculate remaining amounts and final current holding node
   └── Return hop-by-hop MoneyTraceResponse
4. Cycle Detection (/graph/suspicious):
   ├── Identify strongly connected components & simple cycles
   └── Flag circular money laundering rings
```

### C. Asset Recovery Intelligence Flow
```text
1. RecoveryEngine evaluates flagged transaction & alert
2. Evaluates 8 Recovery Scoring Rules:
   ├── Base Score = 100
   ├── Hop Distance Penalty (-10 pts per hop > 1)
   ├── Destination Account Status (Lien/Frozen: -25 pts)
   ├── Multi-Mule Split Penalty (-15 pts)
   ├── Fast Forwarding Velocity (-20 pts)
   ├── Retained Balance preservation bonus (+15 pts)
   ├── Circular Laundering Ring Penalty (-30 pts)
   └── Time Elapsed Penalty (-5 pts per 12 hours)
3. Final Score mapped to RecoveryProbability (HIGH >= 75, MEDIUM 40-74, LOW < 40)
4. Recommended legal / freezing directive generated (Section 91 CrPC notice)
5. Saved into RecoveryCase database table
```

### D. AI Copilot Forensic Reasoning Flow
```text
1. Investigator sends natural language query (POST /assistant/chat)
2. Entity Extraction identifies TXN, ACC, ALT, and REC identifiers via Regex
3. Intent Classifier routes query:
   ├── EXPLAIN_TRANSACTION -> Rule breakdown + XAI attribution bars
   ├── MONEY_TRAIL -> Graph engine hop breakdown
   ├── RECOVERY_CHANCES -> Recovery score + preservation feasibility
   ├── MULE_ACCOUNT -> Passthrough ratio + forwarding velocity
   └── CASE_SUMMARY -> Formal investigation executive briefing
4. RAG Engine searches indexed RBI circulars, PMLA, and Bank SOPs
5. ML Classifier predicts fraud typology with confidence percentage
6. Case Similarity Engine computes cosine closeness against historical cases
7. Assembled response logged to InvestigatorChat and returned to UI
```

### E. Multi-Format Report Generation Flow
```text
1. User requests report download (e.g. GET /reports/investigation/{case_id}/pdf)
2. ReportGenerator compiles database data for Case, Alert, and Transaction
3. Matplotlib generates dynamic chart PNGs (Severity Pie, Recovery Bar Chart)
4. Document Builder builds formatted output:
   ├── PDF: ReportLab Platypus tables, colors, headers, and embedded charts
   ├── DOCX: python-docx structured headings, bullet points, and tables
   ├── XLSX: openpyxl multi-tab workbook with styled headers
   └── CSV: Python csv.writer streaming raw UTF-8 rows
5. Saved to local storage/reports/ directory and streamed as FileResponse
```
