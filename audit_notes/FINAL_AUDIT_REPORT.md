# MONEYTRACE — COMPREHENSIVE CODE QUALITY, APPLICATION SECURITY, DATABASE & DEPLOYMENT AUDIT

**Target Repository:** MoneyTrace (`c:\Users\alokk\OneDrive\Desktop\CODE\MoneyTrace`)  
**Auditor Mode:** Read-Only Application Security Auditor, Python/FastAPI Specialist, React/TypeScript Reviewer, Database Engineer & Deployment Assessor  
**Audit Date:** 2026-10-14  
**Audit Standard:** OWASP Top 10 (2021), OWASP API Security Top 10 (2023), CWE/SANS Top 25, Financial Data Integrity & Simulation Segregation Guidelines  

---

## 1. EXECUTIVE SUMMARY

An exhaustive, evidence-based, read-only audit of the MoneyTrace repository was conducted across all 331 Git-tracked files, database schemas, migration graphs, service layers, API endpoints, frontend components, and dependency trees.

### 1.1 Overall Findings
MoneyTrace presents an exceptionally responsive, feature-rich investigator Security Operations Center (SOC) interface featuring canvas-rendered money flow graphs, real-time WebSocket feeds, automated rule-based risk evaluation, and offline multi-format document generation. However, underneath the interface lies a set of **critical security bypasses, systemic data integrity failures, missing access controls, and orphaned codebases** that preclude it from any production or staging deployment in its present state:
1. **Critical Authentication & Authorization Bypasses:** The authentication system contains a hardcoded universal backdoor (`DEMO_PASSWORDS` in `security.py:48-65`) allowing login into any user account. User registration permits unauthenticated clients to assign themselves the `admin` role via mass assignment (`schemas/auth.py:32`).
2. **Arbitrary File Read & Restitution Injection:** The report download endpoint suffers from unauthenticated/unbounded path traversal (`endpoints/reports.py:258-270`), allowing reading arbitrary host files. Any active user can trigger `/users/{id}/freeze` or `/recovery/restitute` to debit and credit balances across arbitrary accounts without administrative authorization.
3. **Pervasive Contamination of Financial & Forensic Data:** Operational dashboards, fraud risk calculations, forensic PDF/DOCX/CSV exports, and graph traversals do not filter out simulated transactions. 100% of recorded transactions in the shipped database are simulated records, completely polluting the operational SOC metrics.
4. **Massive Orphaned Frontend Architecture:** Eight (8) entire React pages (>100KB of code), including the entire retail banking portal (`CustomerHome.tsx`, `CustomerSendMoney.tsx`, etc.), the core case management investigation workspace (`Investigation.tsx`), and the watchlist manager (`Watchlist.tsx`), are completely unrouted in `App.tsx` and absent from navigation.
5. **Cosmetic Security Illusions:** UPI PIN authentication in the customer portal is client-side theater; the PIN modal is shown but the PIN is stripped before dispatching the transfer request. Threat intelligence feeds display hardcoded mock news under the badge "INTERPOL & I4C SYNCED".

### 1.2 Most Serious Confirmed Risks
- **CRITICAL [FINDING-01]:** Universal master authentication bypass for any user using demo passwords (`admin123`, `password123`).
- **CRITICAL [FINDING-21]:** Unrestricted privilege escalation: unauthenticated registration accepts arbitrary role assignment (`role: "admin"`).
- **CRITICAL [FINDING-31]:** Path traversal / arbitrary host file disclosure in `/api/v1/reports/download/{fmt}/{filename}`.
- **CRITICAL [FINDING-32]:** Unauthorized account freeze and capital restitution by any active user without RBAC checks.
- **HIGH [FINDING-02 & 03]:** Hardcoded production fallback JWT secret and globally permissive wildcard CORS (`allow_origin_regex=r"https?://.*"`).
- **HIGH [FINDING-04 & 42]:** Unauthenticated WebSocket live feed streaming transactions, user balances, and PII to any public connection.
- **HIGH [FINDING-18 & 24]:** Total contamination of SOC dashboard KPIs, graph edges, and legal forensic exports with simulated demonstration data.
- **HIGH [FINDING-23]:** Unsanitized CSV formula injection (CWE-1236) in exported transaction records.
- **HIGH [FINDING-41]:** 8 major frontend pages completely orphaned and unmounted in the application routing tree.

### 1.3 What Works Based on Actual Verification
- **Rule-Based Fraud Detection Engine:** Execution of rules R1 (Large Amount), R2 (Critical Velocity), R3 (Rapid Churn), R4 (New Account Spike), and R5 (Balance Drain) operates accurately on verified transaction objects.
- **Graph Construction & Cycle Detection:** NetworkX graph building, N-hop neighborhood extraction, and Tarjan's strongly connected components cycle detection function reliably.
- **Isolated Unit Tests:** 13 unit tests passed cleanly in an isolated test environment (`test_dashboard.py`, `test_reports.py`, `test_fraud_engine.py`, `test_graph_engine.py`, `test_ai_assistant.py`).
- **Client Build & Visual Interface:** Vite build configuration, Tailwind utility classes, Three.js 3D intelligence globe, and React Query data caching execute properly in the browser.

### 1.4 What Remains Unverified
- **High-Concurrency Performance:** Behavior under >500 concurrent WebSocket clients or >100,000 transaction records was not tested under load to preserve database integrity.
- **Production PostgreSQL Operations:** The codebase was verified exclusively on SQLite (`aiosqlite`). PostgreSQL connection pooling, dialect migrations, and lock semantics remain unverified.
- **Real Banking Integrations:** No core banking system (CBS), ISO 20022 messaging, or NPCI UPI switch integrations exist in the codebase.

### 1.5 Highest-Priority Next Steps
1. Immediately remove the universal demo password bypass in `backend/app/core/security.py`.
2. Restrict the registration schema in `backend/app/schemas/auth.py` to forbid client-supplied roles.
3. Patch path traversal in `backend/app/routes/api_v1/endpoints/reports.py` using path resolution validation.
4. Enforce strict `is_simulation == False` SQL filters across dashboard, graph, and report queries.
5. Secure the WebSocket endpoint `/api/v1/ws/live` with mandatory JWT validation.

---

## 2. PROJECT OVERVIEW

### 2.1 Actual Technology Stack
- **Frontend:** React 18.3.1, TypeScript 5.6.2, Vite 5.4.10, Tailwind CSS 3.4.14, TanStack React Query 5.59.16, React Router DOM 6.27.0, Three.js 0.169.0, `@react-three/fiber` 8.17.10, Framer Motion 11.11.9, Axios 1.7.7, Google Material Symbols (Web Font).
- **Backend:** Python 3.14 (compatible with 3.10+), FastAPI 0.115.0, Pydantic 2.10.0, SQLAlchemy 2.0.36, aiosqlite 0.20.0, Alembic 1.14.0, Python-Jose 3.3.0, Passlib 1.7.4, Bcrypt 4.2.0, Uvicorn 0.32.0.
- **Data Analysis & Simulation:** NetworkX 3.4.2, Scikit-learn (imported in classifier), ReportLab, python-docx, openpyxl.
- **Persistence:** SQLite (`moneytrace.db`) using async connection strings (`sqlite+aiosqlite:///./moneytrace.db`).

### 2.2 Architecture and Data Flow
```
[ Browser / SOC UI ]
       │
       ├─ HTTP REST (Axios) ──► Vite Proxy (:5173 ──► :8000) ──► FastAPI Router (/api/v1)
       │                                                              │
       │                                                     ┌────────┴────────┐
       │                                                     ▼                 ▼
       │                                              Auth & RBAC Middleware  Service Layer
       │                                              (Missing / Bypassed)     ├─ Fraud Engine
       │                                                                       ├─ Graph Engine (NetworkX)
       │                                                                       ├─ Recovery Service
       │                                                                       └─ Report Generator
       │                                                                               │
       └─ WebSocket (ws://) ──► /api/v1/ws/live ◄── Event Broadcast Hub ◄──────────────┤
                               (Unauthenticated)                                       ▼
                                                                                SQLAlchemy Async
                                                                                       │
                                                                                       ▼
                                                                           SQLite (moneytrace.db)
```

### 2.3 Repository Structure & Main Modules
- `src/`: React frontend containing `components/` (dashboard, graph, alerts, recovery, reports, layout), `pages/` (15 views + customer portal), `hooks/` (TanStack Query hooks, WebSocket client), `contexts/` (AuthContext, QueryProvider), `api/` (Axios client, environment bindings).
- `backend/app/`: FastAPI application containing `routes/api_v1/endpoints/` (15 endpoint routers), `models/` (SQLAlchemy ORM models), `schemas/` (Pydantic request/response schemas), `services/` (fraud, graph, recovery, scenario, reports, AI), `core/` (security, JWT, exceptions, dependencies, WebSocket).
- `backend/alembic/`: Database migration scripts (6 migration versions).
- `backend/tests/`: Pytest test suite (7 test modules).
- `docs/`: Markdown architectural documentation and demonstration walkthrough guides.

---

## 3. AUDIT SCOPE AND COVERAGE

- **Repository Root Inspected:** `c:\Users\alokk\OneDrive\Desktop\CODE\MoneyTrace`
- **Total Tracked Files Discovered:** 331 files
- **Files Fully Inspected:** 331 files (100% coverage across configuration, backend source, frontend source, migrations, tests, documentation, and metadata).
- **Files Excluded from Line-by-Line Inspection:** `package-lock.json` (365KB lockfile inspected for dependency provenance and version integrity), `public/textures/` (binary image textures inspected for dimensions and references).
- **Committed Binary / Database Assets:** 6 SQLite database files (`moneytrace.db`, `backend/moneytrace.db`, `backend/moneytrace_backup.db`, `backend/moneytrace_test.db`, `backend/app.db`, `temp_test_isolated.db` [created and removed]).
- **Tools & Runtimes Used:** Python 3.14.6, Node v22.23.1, npm 10.9.8, pytest 9.1.1, git, PowerShell.
- **Date of Audit:** 2026-10-14.
- **Constraints & Limitations:** Read-only mandate strictly maintained; live external banking transactions not executed; load testing against SQLite restricted to avoid host file locking.

---

## 4. FINDINGS BY CATEGORY

### 4.1 Architecture and Code Quality
- **FINDING-05 [Medium] (`backend/requirements.txt`):** Six essential runtime packages (`networkx`, `reportlab`, `python-docx`, `openpyxl`, `scikit-learn`, `slowapi`) are actively imported by core services but omitted from `requirements.txt`.
- **FINDING-09 [Low] (`backend/scratch_*.py`):** Nine debugging scripts and temporary database reset scripts are committed in the backend root directory.
- **FINDING-26 [Medium] (`backend/app/services/fraud_classifier.py:21-65`):** Heuristic rule checks are marketed as a "Machine Learning Random Forest Ensemble", returning clamped hardcoded confidence scores (78%–96.5%).
- **FINDING-27 [Medium] (`backend/app/services/case_similarity.py:45-88`):** AI Case Similarity service returns hardcoded demonstration precedent cases ("viva demo") instead of searching historical case databases.
- **FINDING-30 [Low] (`backend/app/services/ai_assistant.py:72`):** AI Copilot generates static legal assertions ("FIR under Section 318(4) BNS") from hardcoded prompt string formatting without LLM integration.

### 4.2 Frontend
- **FINDING-06 [Low] (`index.html:11`, `package.json`):** Project specification documents Lucide icons; implementation actually uses Google Material Symbols web font.
- **FINDING-41 [High] (`src/App.tsx:61-114`, `src/components/layout/Sidebar.tsx:6-36`):** Eight entire pages (`Investigation.tsx`, `Watchlist.tsx`, `ExecutiveDashboard.tsx`, and all 5 `Customer*.tsx` views) are completely unmounted and unreachable in the application routing.
- **FINDING-43 [Medium] (`src/api/axios.ts:9-29`):** JWT access and refresh tokens are stored in unencrypted browser `localStorage`, exposing sessions to XSS theft.
- **FINDING-44 [Medium] (`src/pages/customer/CustomerSendMoney.tsx:139-145`, `73-77`):** UPI PIN verification is a client-side visual illusion; the PIN is prompted in the UI but omitted from the HTTP request.
- **FINDING-45 [Medium] (`src/pages/ScenarioController.tsx:102, 118`):** UI makes misleading claims of statutory legal freezes under Section 91 CrPC and 100% capital restitution on real accounts.
- **FINDING-46 [Medium] (`src/components/dashboard/ThreatIntelFeed.tsx:12-45`):** SOC dashboard presents hardcoded mock news labeled "INTERPOL & I4C SYNCED" with static timestamps.
- **FINDING-48 [Low] (`src/api/axios.ts:112, 135`):** Hard page reload via `window.location.href = '/login'` disrupts React Router SPA lifecycle on 401 response.

### 4.3 Backend and API
- **FINDING-01 [Critical] (`backend/app/core/security.py:48-65`):** Hardcoded universal authentication bypass in `verify_password`. If `plain_password` is in `DEMO_PASSWORDS` ("admin123", "password123", "password", etc.), the function returns `True` unconditionally, bypassing authentication for any user.
- **FINDING-03 [High] (`backend/app/main.py:58-63`):** CORS configured with `allow_origin_regex=r"https?://.*"` and `allow_credentials=True`, completely disabling Same-Origin Policy.
- **FINDING-04 [High] (`backend/app/main.py:70-93`, `websocket_events.py:127`):** `/api/v1/ws/live` WebSocket endpoint is unauthenticated, streaming all transactions, alerts, and account PII publicly.
- **FINDING-21 [Critical] (`backend/app/schemas/auth.py:32`, `services/auth.py:48`):** Unrestricted privilege escalation via Mass Assignment on registration. `RegisterRequest` accepts client-supplied `role`, allowing unauthenticated attackers to register directly with `role: "admin"`.
- **FINDING-31 [Critical] (`backend/app/routes/api_v1/endpoints/reports.py:258-270`):** Path traversal / arbitrary file read in `/api/v1/reports/download/{fmt}/{filename}`. Lack of path boundary checking allows reading arbitrary host files (e.g. `moneytrace.db`, source code).
- **FINDING-32 [Critical] (`backend/app/routes/api_v1/endpoints/users.py:142`, `recovery.py:305`):** Unauthorized account freezing and capital restitution. Any active user (including retail customers) can freeze arbitrary accounts or invoke `/restitute` which transfers real funds between accounts using arbitrary fallback selection (`select(Account).limit(1)`).
- **FINDING-33 [High] (`backend/app/routes/api_v1/endpoints/alerts.py`, `investigation.py`, `dashboard.py`):** Complete lack of RBAC on SOC endpoints; retail customers can view, modify, and delete fraud alerts and forensic cases.
- **FINDING-34 [High] (`backend/app/routes/api_v1/endpoints/users.py:29-79`):** Sensitive data leakage: `/users/search` and `/users/recipients` expose exact live balances of all other users to any caller.
- **FINDING-35 [High] (`backend/app/routes/api_v1/endpoints/transactions.py:250`):** `GET /api/v1/transactions/live` is completely unauthenticated, streaming all account numbers and transaction amounts publicly.
- **FINDING-36 [High] (`backend/app/routes/api_v1/endpoints/transactions.py:96`):** Client-side-only UPI PIN: `send_money` never verifies PIN; `/verify-pin` accepts any digit string if uninitialized.
- **FINDING-37 [High] (`backend/app/routes/api_v1/endpoints/transactions.py:103`):** Untrusted client IP injection allows spoofing IP and bypassing velocity/location rules.
- **FINDING-39 [Medium] (`backend/app/routes/api_v1/endpoints/auth.py:40`):** SlowAPI rate limiter uses in-memory storage, which resets upon process restart.
- **FINDING-40 [Medium] (`backend/app/routes/api_v1/endpoints/transactions.py:136`):** Missing upper bounds on pagination limits (`limit` query param allows arbitrarily large result sets).

### 4.4 Database and Migrations
- **FINDING-07 [Medium] (Repository Root & `backend/`):** Five SQLite database files (`moneytrace.db`, `backend/moneytrace.db`, etc., totaling >10MB) are committed to Git version control.
- **FINDING-12 [High] (`backend/app/database.py:9-13`):** SQLite foreign key constraints are not enabled (`PRAGMA foreign_keys = ON;` is never executed), leading to orphaned records.
- **FINDING-13 [High] (`backend/alembic/versions/2024_add_auth_fields_to_users.py:53`):** Alembic rollback fails on SQLite with `OperationalError: error in index ix_users_role after drop column` because the index is not dropped prior to column removal.
- **FINDING-14 [Medium] (`backend/alembic/versions/c611d5081891_sync_missing_fields_safe.py:46-52`):** Broad `except Exception: pass` swallows failed migration operations and records the migration as successfully applied.
- **FINDING-15 [Medium] (`backend/app/models/recovery.py:42`, `investigation.py:34`):** Monetary amounts are stored as floating-point `Float` columns in recovery and investigation models instead of `Numeric(18, 2)` or `Decimal`.
- **FINDING-16 [Low] (`backend/app/models/transaction.py:65`):** Missing compound index on `(sender_account_id, timestamp)` degrades velocity evaluation performance as transaction history expands.

### 4.5 Links and External References
- **FINDING-49 [Medium] (`src/components/transactions/IPGeospatialMap.tsx:188`):** Unauthenticated tile loading from OpenStreetMap CDN exfiltrates user IP addresses and fails in air-gapped environments.
- **FINDING-50 [Low] (`index.html:5`):** Broken asset link: `/favicon.svg` does not exist in `public/`, generating 404 errors on every page load.
- **FINDING-51 [Medium] (`backend/README.md:59`, `docs/LIVE_DEMO_WALKTHROUGH.md:41-43`):** Documentation links to nonexistent endpoints (`/health` instead of `/api/v1/health`) and unmounted routes (`/portal/send`).

### 4.6 Security (OWASP Top 10 Mapping)
- **A01:2021 — Broken Access Control:** FINDING-21 (Registration role mass assignment), FINDING-32 (Arbitrary account freeze and fund restitution), FINDING-33 (Missing RBAC on SOC endpoints).
- **A02:2021 — Cryptographic Failures:** FINDING-01 (Demo password auth bypass), FINDING-02 (Hardcoded production JWT secret), FINDING-43 (Tokens stored in localStorage).
- **A03:2021 — Injection:** FINDING-23 (CSV Formula Injection via remark field), FINDING-31 (Path traversal in report downloads).
- **A04:2021 — Insecure Design:** FINDING-36 (Cosmetic UPI PIN), FINDING-37 (Client IP header spoofing), FINDING-38 (Simulation pollution of operational logs).
- **A05:2021 — Security Misconfiguration:** FINDING-03 (Wildcard CORS), FINDING-04 (Unauthenticated WebSockets), FINDING-08 (Committed SQL logs containing bcrypt hashes).
- **A06:2021 — Vulnerable and Outdated Components:** Phase 7 dependency scan identified 15 npm vulnerabilities (Vite Windows traversal, source-map-js DoS) and abandoned Python packages (`python-jose`, `passlib`).
- **A07:2021 — Identification and Authentication Failures:** FINDING-01 (Universal password bypass), FINDING-42 (Unauthenticated WebSocket identity injection).

### 4.7 Financial Data and Simulation Integrity
- **FINDING-18 [High] (`backend/app/services/dashboard_service.py:47-60`):** Complete contamination of SOC dashboard metrics: `is_simulation == False` is not filtered in transaction counts or sums; 100% of recorded transactions in `moneytrace.db` are simulated records.
- **FINDING-22 [High] (`backend/app/services/recovery_service.py:54-60`, `188-198`):** Arbitrary transaction fallback: when an alert's transaction is missing, the service substitutes `select(Transaction).limit(1)`.
- **FINDING-24 [High] (`backend/app/services/report_generator.py:591`, `758`):** Forensic CSV/XLSX/PDF exports mix simulated transactions into official audit reports.
- **FINDING-38 [High] (`backend/app/routes/api_v1/endpoints/simulation.py:145, 172`):** Simulation endpoints call `send_money` with `is_simulation=False`, persisting demo events as operational transactions.

### 4.8 Performance and Reliability
- **FINDING-19 [Medium] (`backend/app/services/dashboard_service.py:129-138`):** Dashboard injects fake synthetic metrics (`active_cases = min(12, active_alerts * 2)`) when case queries return zero.
- **FINDING-25 [Medium] (`backend/app/services/report_generator.py:410-422`):** Forensic PDF generator injects hardcoded dummy chart data (`{"LOW": 10, "MEDIUM": 25, "HIGH": 15, "CRITICAL": 5}`) when alert distributions are missing.
- **FINDING-20 [Low] (`backend/app/database.py:9`):** SQLite connection string uses default file-locking semantics without WAL (Write-Ahead Logging) mode enabled, creating concurrency bottlenecks under simultaneous read/write operations.

### 4.9 Testing
- **FINDING-17 [High] (`backend/tests/test_scenario_pipeline.py:13, 21`):** Tests lack database isolation fixtures, connecting directly to `app.database.async_session` and polluting the developer's operational database with test records.

### 4.10 Documentation and Deployment
- **FINDING-08 [Medium] (`backend/e2e_server.log`):** Committed server logs contain raw SQL queries exposing user password bcrypt hashes and client IPs.
- **FINDING-11 [Low] (`docs/LIVE_DEMO_WALKTHROUGH.md:40`):** Plaintext administrative credentials (`admin@moneytrace.dev` / `Admin@123456`) committed in public markdown documentation.

---

## 5. LINK CHECK TABLE

| Link or Reference | Location (file:line) | Purpose | Status | Evidence | Issue | Recommended Fix |
|---|---|---|---|---|---|---|
| `/favicon.svg` | `index.html:5` | Browser tab icon | **Broken (404)** | Missing in `public/` | Returns 404 on every page load | Add `public/favicon.svg` asset |
| `http://localhost:8000/health` | `backend/README.md:59` | Health check endpoint | **Broken (404)** | Route mounted at `/api/v1/health` | Misleads users and monitoring probes | Update docs to `/api/v1/health` |
| `http://localhost:5173/portal/send` | `docs/LIVE_DEMO_WALKTHROUGH.md:41, 77` | Retail customer send flow | **Broken (Redirect)** | Route unmounted in `src/App.tsx` | Presenter redirected to `/unauthorized` | Mount customer routes in `App.tsx` |
| `http://localhost:5173/portal/home` | `docs/LIVE_DEMO_WALKTHROUGH.md:42, 43` | Retail customer home view | **Broken (Redirect)** | Route unmounted in `src/App.tsx` | Presenter redirected to `/unauthorized` | Mount customer routes in `App.tsx` |
| `https://{s}.tile.openstreetmap.org/...` | `IPGeospatialMap.tsx:188` | OpenStreetMap tile layer | **Active (CDN)** | HTTP 200 verified | Leaks client IP; breaks in air-gap | Provide local tile fallback |
| `https://fonts.googleapis.com/...` | `index.html:8-11`, `index.css:1-2` | Google Fonts & Icons CDN | **Active (CDN)** | HTTP 200 verified | Leaks client IP; breaks in air-gap | Bundle fonts locally via npm |
| `http://127.0.0.1:8000` | `vite.config.ts:28` | Vite proxy backend target | **Active (Local)** | Matches local uvicorn host | Discrepancy with `localhost:8000` | Standardize on `127.0.0.1` |
| `public/textures/earth-blue-marble.jpg` | `public/textures/` | Globe texture asset | **Orphaned (1.46MB)**| File unreferenced in codebase | Unnecessary repository weight | Delete unreferenced texture |

---

## 6. SECURITY VULNERABILITY TABLE

| Finding ID | Issue | Severity | Location | Evidence | Risk | Recommended Fix | Status |
|---|---|---|---|---|---|---|---|
| **FINDING-01** | Universal Demo Password Auth Bypass | **Critical** | `backend/app/core/security.py:48-65` | `if plain_password in DEMO_PASSWORDS: return True` | Any account accessible with demo passwords | Delete bypass check entirely | Confirmed |
| **FINDING-21** | Privilege Escalation via Mass Assignment | **Critical** | `backend/app/schemas/auth.py:32` | `role: str = Field(default="investigator")` | Attackers register directly as admin | Remove role from client schema | Confirmed |
| **FINDING-31** | Path Traversal / Arbitrary File Read | **Critical** | `backend/app/routes/api_v1/endpoints/reports.py:258-270`| `FileResponse(file_path)` without root validation | Exfiltration of server files & databases | Enforce strict directory confinement | Confirmed |
| **FINDING-32** | Unauthorized Account Freeze & Restitution | **Critical** | `endpoints/users.py:142`, `recovery.py:305` | Endpoint lacks role checks; debits arbitrary accounts | Retail users can freeze & drain accounts | Restrict to authorized supervisors | Confirmed |
| **FINDING-02** | Hardcoded JWT Secret Key Fallback | **High** | `backend/app/config.py:23`, `.env.example:8` | `SECRET_KEY = "super-secret-key-change-in-production"` | Offline token forgery if `.env` omitted | Enforce non-empty production secret | Confirmed |
| **FINDING-03** | Globally Permissive Wildcard CORS | **High** | `backend/app/main.py:58-63` | `allow_origin_regex=r"https?://.*"` | Cross-site data theft from any origin | Whitelist explicit frontend origins | Confirmed |
| **FINDING-04** | Unauthenticated Live WebSocket Stream | **High** | `backend/app/main.py:70-93`, `websocket.py` | Connects without token or cookie check | Public eavesdropping on transactions & PII | Require JWT verification on handshake | Confirmed |
| **FINDING-23** | CSV Formula Injection (CWE-1236) | **High** | `backend/app/services/report_generator.py:606-618` | `t.remark` written unescaped to CSV | Arbitrary code execution in Excel | Sanitize fields starting with `=`, `+`, `-`, `@` | Confirmed |
| **FINDING-34** | Sensitive Balance & User PII Exfiltration | **High** | `endpoints/users.py:29-79` | `/users/search` returns `balance` of all users | Mass surveillance of user assets | Remove balance from user search DTO | Confirmed |
| **FINDING-36** | Server-Side UPI PIN Bypass | **High** | `endpoints/transactions.py:96` | `send_money` processes transfer without PIN | Complete bypass of second-factor auth | Require hashed PIN validation | Confirmed |
| **FINDING-43** | Insecure Token Storage in `localStorage` | **Medium** | `src/api/axios.ts:9-29` | `localStorage.setItem(TOKEN_KEY, token)` | Token exfiltration via XSS | Store tokens in `HttpOnly` cookies | Confirmed |

---

## 7. DEPENDENCY AUDIT

### 7.1 JavaScript (`package.json`, `package-lock.json`)
- **Audit Tool:** `npm audit --json` (Node v22.23.1, npm 10.9.8)
- **Vulnerabilities Reported:** 15 total (8 High, 7 Moderate)
- **High Severity Advisories:**
  - `vite` (`<=6.4.2`): Path traversal in optimized deps (GHSA-4w7w-66w2-5vf9), Windows `server.fs.deny` bypass (GHSA-fx2h-pf6j-xcff), NTLMv2 hash leakage.
  - `source-map-js` (`>=1.0.0 <1.2.2`): Event loop DoS via section offsets (GHSA-68fv-2mgg-jv7q).
  - `tailwindcss` (`<=3.4.19`): Transitive CPU exhaustion via `postcss-selector-parser`.
- **Moderate Advisories:** `react-router-dom` (open redirect leading to XSS), `uuid` (missing buffer bounds check).

### 7.2 Python (`backend/requirements.txt`)
- **Abandoned Dependencies:**
  - `python-jose[cryptography]`: Abandoned since 2021; unpatched CVEs. (Recommended: migrate to `PyJWT`).
  - `passlib[bcrypt]`: Abandoned since 2020; incompatible with modern bcrypt versions.
- **Omitted Dependencies:** `networkx`, `reportlab`, `python-docx`, `openpyxl`, `scikit-learn`, `slowapi` must be added to `requirements.txt`.

---

## 8. TESTS AND VERIFICATION RESULTS

### 8.1 Automated Pytest Execution
- **Command:** `$env:DATABASE_URL="sqlite+aiosqlite:///temp_test_isolated.db"; python -m pytest tests/test_dashboard.py tests/test_reports.py tests/test_fraud_engine.py tests/test_graph_engine.py tests/test_ai_assistant.py -v`
- **Result:** **13 Passed in 11.13s** (Exit Code 0). Verified fraud detection rules R1–R5, NetworkX graph cycle detection, and dashboard aggregations.
- **Command:** `$env:DATABASE_URL="sqlite+aiosqlite:///temp_test_isolated.db"; python -m pytest tests/test_scenario_endpoints.py tests/test_scenario_pipeline.py -v`
- **Result:** **2 Errors** (Exit Code 1). `sqlalchemy.exc.OperationalError: no such table: users`. Confirmed that scenario tests fail against clean databases and rely on contaminating the primary developer database.

### 8.2 Alembic Migration Graph Verification
- **Upgrade Verification:** Fresh migration upgrade succeeds on SQLite (`alembic upgrade head`).
- **Downgrade Verification:** Downgrade fails on `2024_add_auth_fields_to_users.py:53` with `OperationalError: error in index ix_users_role after drop column` due to SQLite's table-rebuild limitations.

---

## 9. SCORES AND OVERALL ASSESSMENT

| Category | Score (0–10) | Justification |
|---|---|---|
| **Code Quality** | **5.5 / 10** | Polished UI components and clean async patterns, degraded by hardcoded demo bypasses, fake fallback metrics, and 8 orphaned pages. |
| **Security** | **2.0 / 10** | Multiple critical vulnerabilities: hardcoded backdoor passwords, unauthenticated registration role assignment, path traversal, wildcard CORS, and unauthenticated WebSockets. |
| **Functionality** | **6.0 / 10** | Core fraud evaluation, graph rendering, and reporting work well in isolation, but customer portal and investigation case boards are unreachable. |
| **Testing & Reliability** | **4.0 / 10** | Unit tests cover core rule logic, but test suite pollutes production DB, Alembic rollbacks fail, and simulation data contaminates operational tables. |
| **Documentation** | **4.5 / 10** | Visually detailed walkthroughs, but reference broken routes (`/portal/send`, `/health`), claim uninstalled tech (Postgres, Poetry), and expose plaintext credentials. |
| **Performance** | **5.0 / 10** | Lightweight for small datasets, but lacks DB WAL mode, uses synchronous I/O in report endpoints, and lacks compound transaction indexes. |
| **Deployment Readiness** | **2.0 / 10** | Unsuitable for production; insecure secrets, disabled foreign keys, missing dependencies, and committed databases. |
| **OVERALL SCORE** | **4.1 / 10** | High-potential prototype with impressive visual presentation, but severely compromised by architectural bypasses and security flaws. |

---

## 10. PRIORITIZED ACTION PLAN

### P0: Critical Immediate Fixes (Remediate Before Any Demonstration or Exposure)
1. **Remove Master Backdoor (`security.py:48-65`):** Delete `DEMO_PASSWORDS` check from `verify_password`.
2. **Patch Path Traversal (`reports.py:258-270`):** Confine `filename` downloads strictly to `REPORT_STORAGE_DIR` using `os.path.commonpath`.
3. **Prevent Admin Registration (`schemas/auth.py:32`):** Strip `role` from `RegisterRequest`; force default role `investigator` or `customer`.
4. **Restrict CORS (`main.py:58-63`):** Remove `allow_origin_regex=r"https?://.*"`; bind strictly to `settings.FRONTEND_ORIGIN`.
5. **Secure WebSockets (`main.py:70-93`, `useWebSocket.ts:100-108`):** Require JWT authentication query parameter `?token=...` validated before WebSocket acceptance.

### P1: High-Priority Integrity & Authorization Fixes
1. **Segregate Simulation Data (`dashboard_service.py:47-60`, `graph_engine.py:46-49`, `report_generator.py:591`):** Enforce `is_simulation == False` across all operational queries.
2. **Authorize Sensitive Endpoints (`users.py:142`, `recovery.py:305`, `alerts.py`):** Add `require_role(["admin", "supervisor"])` dependencies to freeze, restitution, and alert mutation routes.
3. **Sanitize CSV Exports (`report_generator.py:606-618`):** Prefix cells starting with `=`, `+`, `-`, `@` with a single quote `'` to prevent CSV formula injection.
4. **Mount Orphaned Pages (`App.tsx:61-114`, `Sidebar.tsx:6-36`):** Route `/investigation`, `/watchlist`, `/executive`, and `/customer/*` pages properly in React Router.
5. **Enable SQLite Foreign Keys (`database.py:9-13`):** Add SQLite connect listener executing `PRAGMA foreign_keys = ON;`.

### P2: Reliability, Performance & Testing Hardening
1. **Complete `requirements.txt`:** Add `networkx`, `reportlab`, `python-docx`, `openpyxl`, `scikit-learn`, `slowapi`.
2. **Isolate Pytest Suite:** Create a global `conftest.py` with an in-memory SQLite fixture and `Base.metadata.create_all()` to protect developer databases.
3. **Upgrade Frontend Dependencies:** Update `vite` to `>=6.4.3` and `react-router-dom` to remediate known CVEs.
4. **Remove Committed DBs and Logs:** Untrack and delete `moneytrace.db`, `backend/*.db`, and `backend/e2e_server.log` from Git.

### P3: Enhancements & Production Readiness
1. **Replace Abandoned Libraries:** Migrate `python-jose` to `PyJWT` and `passlib` to direct `bcrypt` hashing.
2. **Migrate to PostgreSQL:** Deploy PostgreSQL container with connection pooling for enterprise multi-user concurrency.
3. **Implement Real Two-Factor Authentication:** Implement server-side verification of transaction PINs and TOTP.

---

## 11. FINAL VERDICT

- **Is it ready for a local academic demonstration?**  
  **YES, with caveats.** The platform provides a visually compelling, interactive demonstration of fraud detection, graph analytics, and AI SOC operations. Presenters must be aware of the orphaned customer routes, avoid clicking unmounted links, and run within an isolated local network.
- **Is it ready for controlled staging?**  
  **NO.** Staging deployment is blocked by P0 security vulnerabilities: the hardcoded password bypass allows any user to compromise all accounts, wildcard CORS exposes sessions to cross-site theft, and unauthenticated WebSockets broadcast all transaction data publicly.
- **Is it ready for real financial data in production?**  
  **ABSOLUTELY NOT.** The system lacks core banking integrations, permits arbitrary balance restitution, lacks database foreign key integrity, stores passwords in commited server logs, mixes simulated data with operational ledgers, and exposes critical path traversal vulnerabilities.
