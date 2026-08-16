# MoneyTrace Project Structure & Directory Reference

This document provides a directory-by-directory breakdown of the **MoneyTrace** platform, mapping out the frontend client, backend application, business intelligence layers, database models, and offline storage.

---

## 1. Directory Tree Overview

```text
MoneyTrace/
├── .gitignore
├── README.md                      # Master Overview & Project Summary
├── PROJECT_STRUCTURE.md           # This document
├── SYSTEM_ARCHITECTURE.md         # System Architecture & Layer Diagram
├── DATA_FLOW.md                   # Step-by-Step Data Flow & Sequence Diagrams
├── DATABASE_SCHEMA.md             # SQLAlchemy ORM Schema & ER Diagram
├── API_REFERENCE.md               # Complete REST API Endpoint Reference
├── AI_ENGINE_DOCUMENTATION.md     # Deep-Dive into Fraud, Graph, Recovery & AI Engines
├── INSTALLATION_GUIDE.md          # Step-by-Step Setup Guide
├── DEMO_GUIDE.md                  # Comprehensive Demo / Viva Script
├── CLEANUP_REPORT.md              # Repository Audit & Recommendations
├── index.html                     # Vite HTML Entrypoint
├── package.json                   # Node.js Dependencies & Scripts
├── tsconfig.json                  # TypeScript Compiler Configuration
├── vite.config.ts                 # Vite Build & Dev Server Configuration
├── tailwind.config.js             # Tailwind Design Tokens & Styling
├── postcss.config.js              # PostCSS Configuration
├── src/                           # React 18 TypeScript Frontend Source
│   ├── main.tsx                   # React DOM Entrypoint
│   ├── App.tsx                    # Root Router & Providers
│   ├── index.css                  # Global Tailwind & Design System Tokens
│   ├── api/                       # Axios Client & Interceptors
│   ├── components/                # Modular UI Components
│   ├── contexts/                  # AuthContext & React Query Provider
│   ├── hooks/                     # Custom TanStack React Query Hooks
│   ├── pages/                     # Full Page View Modules
│   ├── services/                  # Frontend REST API Service Connectors
│   ├── types/                     # TypeScript Interface Definitions
│   └── utils/                     # Formatters & Helpers
└── backend/                       # FastAPI Python Backend Source
    ├── app/                       # Application Core
    │   ├── config.py              # Pydantic Settings & Environment Variables
    │   ├── database.py            # Async SQLAlchemy Engine & Session Factory
    │   ├── main.py                # FastAPI Application & Middleware Entrypoint
    │   ├── core/                  # Security, JWT, Dependencies & Exceptions
    │   ├── models/                # SQLAlchemy Database Models
    │   ├── routes/                # FastAPI Endpoints & Versioned Routing
    │   ├── schemas/               # Pydantic Request/Response DTOs
    │   └── services/              # Forensic & Intelligence Business Logic
    ├── alembic/                   # Database Migrations
    ├── scripts/                   # Seeding, Simulation & Integration Test Scripts
    ├── storage/                   # Local Offline Storage (PDFs, DOCX, CSV, XLSX, Charts)
    └── tests/                     # Automated Pytest Test Suite
```

---

## 2. Frontend Architecture (`src/`)

| Folder / File | Purpose & Contents |
| :--- | :--- |
| **`src/main.tsx`** | React 18 root mounting point with StrictMode and theme initialization. |
| **`src/App.tsx`** | Application routing (`react-router-dom`), ProtectedRoute guards, Code Splitting (lazy loading), and Global Loading Overlays. |
| **`src/index.css`** | Modern Dark-Mode design system tokens, CSS glassmorphism classes, and custom typography variables. |
| **`src/api/`** | `axios.ts` (API instance, JWT token injection, auto 401 refresh), `env.ts` (Endpoint variables), `errors.ts` (Error boundary parser). |
| **`src/components/`** | Split by domain: `auth/` (LoginForm, RegisterForm), `common/` (ProtectedRoute, LoadingSpinner, Pagination, StatCard), `layout/` (AppLayout, TopNav, Sidebar), `transactions/` (TransactionTable). |
| **`src/contexts/`** | `AuthContext.tsx` (Global user identity, token persistence), `QueryProvider.tsx` (TanStack React Query Cache). |
| **`src/hooks/`** | Custom React hooks wrapping React Query: `useAuth`, `useAlerts`, `useTransactions`, `useFlow`, `useInvestigations`, `useRecovery`, `useDashboard`, `useChat`, `useReports`. |
| **`src/pages/`** | 9 Core Application Views: |
| • `Dashboard.tsx` | Executive SOC Dashboard with live KPI counters, 30-day volume trends, risk distribution, and quick action bar. |
| • `Transactions.tsx` | High-throughput banking transaction feed with real-time risk scores, status chips, and multidimensional filters. |
| • `Alerts.tsx` | Alert Center for SOC analysts with rule attribution breakdowns, status workflows (NEW ➔ INVESTIGATING ➔ RESOLVED), and freeze actions. |
| • `Flow.tsx` | NetworkX money flow network visualizer, multi-hop money trail tracer, and circular laundering cycle inspection. |
| • `Recovery.tsx` | Asset Recovery Intelligence Center with recovery feasibility scores (0–100), holding node identification, and freeze directives. |
| • `Investigation.tsx`| Deep-dive forensic case management dossiers. |
| • `Chat.tsx` | AI Investigator Assistant (MoneyTrace Copilot Pro) with NLU conversation, Explainable AI (XAI) feature importance bars, and RAG policy drawer. |
| • `Reports.tsx` | Reports & Export Center with 1-click downloads for PDF dossiers, Word DOCX briefs, multi-tab Excel workbooks, and CSV streams. |
| • `Settings.tsx` | Engine configurations, endpoint status, and database diagnostics. |
| **`src/services/`** | Frontend API client connectors mapping 1-to-1 with backend REST endpoints (`authService`, `alertService`, `transactionService`, `dashboardService`, `recoveryService`, `chatService`, `reportService`). |
| **`src/types/`** | Shared TypeScript interfaces (`User`, `Transaction`, `FraudAlert`, `RecoveryCase`, `ChatMessage`, `ReportHistoryItem`). |
| **`src/utils/`** | Helper formatters: `formatCurrency` (INR formatting), `formatDate`, `formatAddress`, `formatTxHash`. |

---

## 3. Backend Architecture (`backend/app/`)

### A. Core Foundation (`backend/app/core/`)
- `security.py`: Argon2 / PBKDF2 password hashing (`pwd_context.hash`), JWT access & refresh token generation (`create_access_token`, `create_refresh_token`).
- `deps.py`: FastAPI dependency injection (`get_current_user`, `get_current_active_user`, `require_role`).
- `exceptions.py`: Standardized domain exceptions (`AppException`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ValidationError`).

### B. Database Models (`backend/app/models/`)
- `user.py` (`User`): Primary user registry supporting roles (`ADMIN`, `INVESTIGATOR`, `ANALYST`, `CUSTOMER`).
- `account.py` (`Account`): Bank account ledger storing unique `account_number`, `balance`, `status` (`ACTIVE`, `FROZEN`, `CLOSED`).
- `transaction.py` (`Transaction`): Immutable transaction ledger recording `transaction_id`, `amount`, `status`, `device_info`, `ip_address`, `location`, `risk_score`, and `is_flagged`.
- `fraud_alert.py` (`FraudAlert`): Fraud alerts with `risk_score` (0–100), `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `status` (`OPEN`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`), and JSON `rule_breakdown`.
- `recovery.py` (`RecoveryCase`): Asset recovery case tracking `recovery_score`, `recovery_probability` (`LOW`, `MEDIUM`, `HIGH`), `current_holder_account`, `amount_at_risk`, and `recommended_action`.
- `investigator_chat.py` (`InvestigatorChat`): Conversation log for AI Copilot queries, classified intents, and contextual metadata.

### C. Forensic Intelligence Services (`backend/app/services/`)
- `fraud_engine.py`: 8-rule deterministic and behavioral fraud detection engine.
- `graph_engine.py`: NetworkX directed multi-graph (`MultiDiGraph`) money flow tracer, circular cycle detector, and mule/collector node classifier.
- `recovery_engine.py`: 8 recovery probability calculation rules evaluating hop distance, destination node status, and fund dispersion.
- `recovery_service.py`: High-level asset recovery workflow coordinator and stats engine.
- `dashboard_service.py`: High-performance aggregation service computing live SOC metrics, 30-day trends, geographic corridors, composite risk rankings, and investigator leaderboards.
- `rag_knowledge.py`: Offline compliance knowledge base with indexed RBI circulars, PMLA Section 12 regulations, I4C mule matrices, and IBA SOPs.
- `fraud_classifier.py`: ML fraud pattern typology classifier predicting 6 typologies (`Mule Account Activity`, `Money Laundering`, `Account Takeover`, `UPI Phishing`, `Investment Scam`, `Identity Theft`) with confidence scores.
- `case_similarity.py`: Multi-dimensional cosine matching finding historically precedent cases.
- `ai_assistant.py`: Enterprise NLU forensic assistant orchestrating flag reasoning, money trail explanations, Explainable AI (XAI) feature importance weights, and investigator recommendations.
- `report_generator.py`: Multi-format report builder exporting PDFs (`reportlab`), DOCX (`python-docx`), CSVs, and Excel workbooks (`openpyxl`) with embedded Matplotlib charts.

### D. REST API Endpoints (`backend/app/routes/api_v1/endpoints/`)
- `auth.py`: Registration, Login, Token Refresh, Current User Profile.
- `transactions.py`: Transaction creation, retrieval, filtering, and live stream feed.
- `fraud.py`: Alert triage, rule breakdowns, status updates, and transaction re-evaluation.
- `graph.py`: Money flow paths (`/trace/{id}`), account networks, full topology, and suspicious rings.
- `recovery.py`: Recovery cases list, case detail, high-probability cases, and score recalculations.
- `dashboard.py`: 10 SOC analytics endpoints (Overview, Live Feed, Volume Trends, Severities, Locations, Composite Risk, Leaderboard, Export).
- `assistant.py`: AI Copilot chat, transaction flag explanations, mule explanations, RAG compliance search, and chat history.
- `reports.py`: 14 report and export endpoints for PDF, DOCX, CSV, and XLSX downloads.
- `users.py`: User and account profile management.
- `health.py`: System diagnostic and health probes.

---

## 4. Local Storage Structure (`backend/storage/`)

```text
backend/storage/reports/
├── pdf/          # Generated court-admissible PDF investigation dossiers
├── docx/         # Editable Microsoft Word investigation briefs
├── csv/          # Raw tabular data streams (Transactions, Alerts, Cases, Accounts)
├── xlsx/         # Multi-sheet OpenPyXL executive analytics workbooks
└── charts/       # Generated Matplotlib charts (Fraud severity pie, Recovery bar charts)
```
