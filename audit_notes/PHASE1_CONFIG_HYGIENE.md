# PHASE 1 AUDIT NOTES: Configuration, Environment, Dependencies & Repository Hygiene

**Date:** 2026-10-14  
**Scope:** Root files, backend configuration, environment definitions, dependency manifests, logs, scratch utilities, and repository hygiene.

---

## 1. Files Inspected in Phase 1

- `.gitignore` (Inspected: missing `*.db`, `*.log`, `storage/reports/*`)
- `index.html` (Inspected: loads Google Fonts & Material Symbols; references non-existent `/favicon.svg`)
- `package.json` & `package-lock.json` (Inspected: React 18, Vite, Three.js, Leaflet; `lucide-react` absent)
- `postcss.config.js` & `tailwind.config.js` (Inspected: custom CSS variable theme, font mismatch)
- `tsconfig.json` & `tsconfig.node.json` (Inspected: standard Vite TS configuration)
- `vite.config.ts` (Inspected: dev proxy to `127.0.0.1:8000`, `host: true`)
- `backend/requirements.txt` (Inspected: missing `networkx`, `reportlab`, `python-docx`, `openpyxl`, `scikit-learn`, `slowapi`)
- `backend/.env.example` (Inspected: documents Postgres URL, default secret key)
- `backend/alembic.ini` (Inspected: points to PostgreSQL by default, overridden in `env.py`)
- `backend/app/config.py` (Inspected: fallback hardcoded `SECRET_KEY`, SQLite default path)
- `backend/app/database.py` (Inspected: SQLite async engine without foreign keys or WAL mode)
- `backend/app/main.py` (Inspected: CORS regex wildcard, unauthenticated WebSocket)
- `backend/app/core/security.py` (Inspected: DEMO_PASSWORDS universal bypass, bcrypt implementation)
- `backend/app/core/deps.py` (Inspected: JWT auth dependencies; lacks investigator role check)
- `backend/app/core/websocket.py` & `websocket_events.py` (Inspected: unauthenticated presence & broadcast)
- `backend/app/core/exceptions.py` & `responses.py` (Inspected: custom exceptions, Pydantic `GenericModel` deprecation)
- Committed databases: `moneytrace.db` (root), `backend/moneytrace.db`, `backend/moneytrace_backup.db`, `backend/moneytrace_test.db`, `backend/app.db` (Inspected: schema differences, tracked in git)
- Committed logs & dumps: `backend/e2e_server.log`, `backend/graph_test_output.txt`, `test-results/.last-run.json` (Inspected: leaked password hashes, test failures)
- Scratch scripts: `backend/scratch_*.py` (10 files), `backend/clean_database.py` (Inspected: arbitrary data deletion, migration rewriting)

---

## 2. Findings Identified

### FINDING-01: Universal Hardcoded Authentication Bypass Backdoor
- **Severity:** CRITICAL (CVSS 9.8)
- **Location:** `backend/app/core/security.py:48-65`
- **Evidence:**
  ```python
  DEMO_PASSWORDS = {
      "admin123", "Admin123", "Admin@123456", "Invest123", "Invest@123",
      "Customer123", "Customer@123", "Pass123", "password", "password123", "secret123",
  }
  if plain_password in DEMO_PASSWORDS:
      return True
  ```
- **Description:** `verify_password` evaluates whether `plain_password` is in a set of hardcoded demo passwords *before* or regardless of the hash match. If a user supplies any of these strings, `verify_password` unconditionally returns `True` for ANY account, regardless of the user's actual password.
- **Impact:** Complete system takeover. Anyone knowing or guessing any user's email address can authenticate as admin or investigator using `password` or `admin123`.
- **Recommended Fix:** Remove `DEMO_PASSWORDS` bypass from `verify_password`. Seed test/demo accounts with known hashed passwords if needed for demonstrations, but never bypass cryptographic verification.

### FINDING-02: Hardcoded Fallback JWT Secret Key
- **Severity:** HIGH (CVSS 7.5)
- **Location:** `backend/app/config.py:23`, `backend/.env.example:8`
- **Evidence:**
  ```python
  SECRET_KEY: str = "super-secret-key-change-in-production"
  ```
- **Description:** If no `.env` file exists or `SECRET_KEY` is not provided in environment variables, the backend defaults to a publicly known static key.
- **Impact:** Attackers can forge valid JWT access tokens for any `user_id` and role without authenticating.
- **Recommended Fix:** Require `SECRET_KEY` to be set via environment variable or raise an exception on startup in non-development modes; generate a random cryptographic key or enforce minimum entropy.

### FINDING-03: Overly Permissive CORS Policy with Credentials Enabled
- **Severity:** HIGH (CVSS 7.4)
- **Location:** `backend/app/main.py:58-63`
- **Evidence:**
  ```python
  allow_origin_regex=r"https?://.*",
  allow_credentials=True,
  ```
- **Description:** The regular expression `https?://.*` matches all HTTP and HTTPS origins worldwide. Coupled with `allow_credentials=True`, this negates the Same-Origin Policy.
- **Impact:** Any malicious web page visited by an authenticated investigator or customer can execute authenticated cross-origin requests against the MoneyTrace API and read responses.
- **Recommended Fix:** Remove `allow_origin_regex=r"https?://.*"` and configure explicit trusted origins (e.g., `settings.FRONTEND_ORIGIN`).

### FINDING-04: Unauthenticated Live WebSocket Stream Leaking Sensitive Financial & SOC Events
- **Severity:** HIGH (CVSS 7.5)
- **Location:** `backend/app/main.py:70-93`, `backend/app/core/websocket_events.py:127-150`
- **Evidence:**
  ```python
  @app.websocket("/ws/live")
  @app.websocket("/api/v1/ws/live")
  async def websocket_live_endpoint(websocket: WebSocket, ...):
      query_params = websocket.query_params
      uid = user_id or query_params.get("user_id") or "anonymous"
      user_role = role or query_params.get("role") or "ANALYST"
      await ws_manager.connect(websocket, ...)
  ```
- **Description:** No authentication token (JWT) is validated when establishing a WebSocket connection. Additionally, clients can self-assign any `role` or `username`. All transactions, high-risk alerts, recovery cases, and presence updates are broadcast to all open connections.
- **Impact:** Real-time eavesdropping on financial crime investigations, customer account numbers, transaction amounts, and fraud alerts by unauthorized external parties.
- **Recommended Fix:** Require JWT token validation via subprotocol or query parameter upon connection before accepting the WebSocket handshake. Filter events by user role and authorization level.

### FINDING-05: Missing Core Production Dependencies in requirements.txt
- **Severity:** MEDIUM
- **Location:** `backend/requirements.txt:1-24`
- **Evidence:** `requirements.txt` specifies only 10 packages (`fastapi`, `uvicorn`, `SQLAlchemy`, `asyncpg`, `psycopg2-binary`, `alembic`, `aiosqlite`, `python-dotenv`, `pydantic-settings`, `pydantic`, `passlib`, `python-jose`, `python-multipart`). Codebase imports `networkx`, `reportlab`, `docx`, `openpyxl`, `sklearn`, `slowapi`.
- **Impact:** Clean-slate deployment fails immediately with `ModuleNotFoundError` during startup.
- **Recommended Fix:** Update `requirements.txt` with pinned versions of all required runtime dependencies.

### FINDING-06: Discrepancy in Icon Library Documentation vs Implementation
- **Severity:** INFORMATIONAL / LOW
- **Location:** `package.json:11-26`, `src/components/layout/Sidebar.tsx:48`, `index.html:11`
- **Evidence:** Specification claims `Lucide icons`. The repository does not install or use `lucide-react`; it uses Google Material Symbols web font loaded from external Google Fonts CDN.
- **Impact:** In offline or air-gapped deployments, UI icons fail to render without internet connectivity.
- **Recommended Fix:** Bundle icon SVG components locally or install an offline-capable icon package.

### FINDING-07: Multiple SQLite Databases Committed to Repository with Schema Divergence
- **Severity:** MEDIUM
- **Location:** `moneytrace.db`, `backend/moneytrace.db`, `backend/moneytrace_backup.db`, `backend/moneytrace_test.db`, `backend/app.db`
- **Evidence:** 5 SQLite databases are committed into Git history. Root `moneytrace.db` (3.2MB) lacks `scenario_runs` and `alembic_version`. `backend/app.db` is 0 bytes. `.gitignore` does not ignore `*.db`.
- **Impact:** Data inconsistency and divergence based on working directory. Repository bloat (over 10MB of binary database dumps in Git). Risk of overwriting production state.
- **Recommended Fix:** Add `*.db` to `.gitignore`, remove databases from Git tracking, use reproducible seed scripts for test databases.

### FINDING-08: Committed Sensitive Logs in Git History
- **Severity:** LOW
- **Location:** `backend/e2e_server.log`, `backend/graph_test_output.txt`
- **Evidence:** `e2e_server.log` (98KB) contains raw SQL statements printing user bcrypt hashes, emails, IPs, account numbers, and transaction amounts.
- **Impact:** PII and credential hash exposure in source control.
- **Recommended Fix:** Remove log files from Git tracking, add `*.log` to `.gitignore`.

### FINDING-09: Missing Asset (404) in Root HTML Template
- **Severity:** LOW
- **Location:** `index.html:5`
- **Evidence:** `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` references a non-existent file.
- **Impact:** 404 console errors on all page visits.
- **Recommended Fix:** Add `favicon.svg` to `public/` directory or update the link.

### FINDING-10: Deprecated Pydantic V2 Usage
- **Severity:** LOW
- **Location:** `backend/app/core/responses.py:6`
- **Evidence:** `from pydantic.generics import GenericModel`
- **Impact:** Emits runtime deprecation warnings and may break in future Pydantic minor upgrades.
- **Recommended Fix:** Inherit directly from `pydantic.BaseModel, Generic[T]`.

### FINDING-11: Cluttered Scratch Scripts in Production Codebase
- **Severity:** LOW / MAINTAINABILITY
- **Location:** `backend/scratch_*.py` (10 files), `backend/clean_database.py`
- **Evidence:** Scripts like `scratch_reset_alembic.py`, `scratch_rewrite_safe.py`, `clean_database.py` contain destructive operations and ad-hoc experiments left in the backend root directory.
- **Impact:** High risk of accidental execution causing database truncation or migration corruption.
- **Recommended Fix:** Move developer utilities to an unversioned `scripts/dev/` folder or delete obsolete scratch files.
