# PHASE 4 AUDIT NOTES: Backend API Routes, Core Middleware & Security

**Date:** 2026-10-14  
**Scope:** All 15 API v1 endpoint modules under `backend/app/routes/api_v1/endpoints/*.py`, `backend/app/routes/root.py`, and API middleware.

---

## 1. Files Inspected in Phase 4

- `backend/app/routes/root.py` (Inspected: root message, `/health` endpoint)
- `backend/app/routes/api_v1/__init__.py` (Inspected: route mounting prefixes)
- `backend/app/routes/api_v1/endpoints/auth.py` (Inspected: register, login, refresh, logout, /me)
- `backend/app/routes/api_v1/endpoints/users.py` (Inspected: search leaking balances, unauthenticated /active, unauthorized /freeze)
- `backend/app/routes/api_v1/endpoints/transactions.py` (Inspected: bypassable PIN, unauthenticated /live feed, IP spoofing)
- `backend/app/routes/api_v1/endpoints/alerts.py` (Inspected: missing RBAC, customer can dismiss/acknowledge alerts)
- `backend/app/routes/api_v1/endpoints/recovery.py` (Inspected: unauthorized restitute, random account fund transfer)
- `backend/app/routes/api_v1/endpoints/reports.py` (Inspected: path traversal in report download endpoint)
- `backend/app/routes/api_v1/endpoints/investigation.py` (Inspected: missing RBAC on forensic cases and evidence)
- `backend/app/routes/api_v1/endpoints/scenarios.py` (Inspected: role-checked scenario controller endpoints)
- `backend/app/routes/api_v1/endpoints/simulation.py` (Inspected: creates operational txns, phantom WS alerts)
- `backend/app/routes/api_v1/endpoints/audit_logs.py` (Inspected: audit trail accessible to customers)
- `backend/app/routes/api_v1/endpoints/dashboard.py` (Inspected: executive metrics exposed to customers)
- `backend/app/routes/api_v1/endpoints/fraud.py` (Inspected: rules evaluation)
- `backend/app/routes/api_v1/endpoints/graph.py` (Inspected: unauthenticated topology access)
- `backend/app/routes/api_v1/endpoints/assistant.py` (Inspected: AI chat endpoints)
- `backend/app/routes/api_v1/endpoints/watchlist.py` (Inspected: watchlist CRUD)

---

## 2. Findings Identified

### FINDING-31: Arbitrary File Read / Path Traversal in Report Download Endpoint
- **Severity:** CRITICAL (CVSS 8.6)
- **Location:** `backend/app/routes/api_v1/endpoints/reports.py:258-270`
- **Evidence:**
  ```python
  @router.get("/download/{fmt}/{filename}")
  async def download_archived_report(
      fmt: str,
      filename: str,
      current_user: User = Depends(get_current_active_user),
  ) -> FileResponse:
      target_dir = BASE_STORAGE / fmt.lower()
      file_path = target_dir / filename

      if not file_path.exists() or not file_path.is_file():
          raise HTTPException(status_code=404, detail="Report file not found")
  ```
- **Description:** Path traversal characters (`../` or `..\`) in the `filename` parameter are concatenated directly to `target_dir` without path sanitization or boundary verification.
- **Impact:** An authenticated user can read arbitrary files on the host filesystem, including `backend/app/config.py`, database files (`moneytrace.db`), and system configurations.
- **Recommended Fix:** Validate that `file_path.resolve().is_relative_to(BASE_STORAGE.resolve())`, or use `os.path.basename(filename)`.

### FINDING-32: Unauthorized Account Freezing and Restitution Fund Transfer by Any Active User
- **Severity:** CRITICAL (CVSS 9.1)
- **Location:** `backend/app/routes/api_v1/endpoints/users.py:142-148`, `backend/app/routes/api_v1/endpoints/recovery.py:305-364`
- **Evidence:**
  `POST /api/v1/users/accounts/{account_number}/freeze` and `POST /api/v1/recovery/cases/{case_id}/restitute` rely solely on `Depends(get_current_active_user)`.
  In `restitute_case`:
  ```python
  holder.balance -= amount_to_restore
  victim.balance += amount_to_restore
  ```
  If victim is not found, it falls back to:
  ```python
  select(Account).where(Account.account_number != holder_acc_num).limit(1)
  ```
- **Description:** Any active user (including a standard retail customer) can freeze arbitrary bank accounts or trigger the restitution workflow to debit funds from one account and credit them to an arbitrary third account.
- **Impact:** Financial loss, account denial of service, and unauthorized fund movement.
- **Recommended Fix:** Restrict `/freeze` and `/restitute` strictly to users with `role in [UserRole.ADMIN, UserRole.INVESTIGATOR]`, and enforce rigorous transaction validations.

### FINDING-33: Complete Absence of Role-Based Access Control (RBAC) on Core SOC Endpoints
- **Severity:** HIGH (Broken Access Control)
- **Location:** `backend/app/routes/api_v1/endpoints/alerts.py`, `investigation.py`, `dashboard.py`, `recovery.py`, `audit_logs.py`
- **Evidence:** Endpoints declare `current_user: User = Depends(get_current_active_user)` with zero role checks.
- **Impact:** Retail banking customers can access the Security Operations Center, view executive financial metrics, inspect confidential fraud alerts, read and upload evidence in criminal investigations, and inspect complete audit trails.
- **Recommended Fix:** Create and apply an `investigator_or_admin` dependency across all SOC and administrative endpoints.

### FINDING-34: Sensitive Financial Data Exposure (Balances & Account Numbers) in User Search
- **Severity:** HIGH (Data Privacy & PII)
- **Location:** `backend/app/routes/api_v1/endpoints/users.py:29-79`, `85-119`
- **Evidence:**
  `GET /api/v1/users/search` and `GET /api/v1/users/recipients` serialize:
  ```python
  UserSearchResult(
      user_id=user.id,
      full_name=user.full_name,
      email=user.email,
      account_number=account.account_number,
      balance=float(account.balance),
      status=account.status,
  )
  ```
- **Description:** Searching for a transfer recipient returns that recipient's private bank balance and account status to any customer.
- **Impact:** Massive leak of customer financial privacy and balance information.
- **Recommended Fix:** Remove `balance` from `UserSearchResult` and only expose public recipient identifiers (name, masked account number).

### FINDING-35: Unauthenticated Public Live Transaction Stream
- **Severity:** HIGH (Information Disclosure)
- **Location:** `backend/app/routes/api_v1/endpoints/transactions.py:250-270`
- **Evidence:**
  ```python
  @router.get("/live", response_model=list[LiveTransactionResponse])
  async def get_live_transactions(
      limit: int = Query(50, ge=1, le=200),
      session: AsyncSession = Depends(get_session),
  )
  ```
- **Description:** `GET /api/v1/transactions/live` lacks authentication and streams the latest transaction IDs, sender account numbers, receiver account numbers, amounts, and timestamps publicly.
- **Impact:** Complete exposure of all ongoing banking transactions to unauthenticated web scrapers.
- **Recommended Fix:** Add authentication dependency `current_user = Depends(get_current_active_user)` and restrict to authorized roles.

### FINDING-36: Purely Cosmetic Client-Side Transaction PIN Verification
- **Severity:** HIGH (Authentication & Authorization)
- **Location:** `backend/app/routes/api_v1/endpoints/transactions.py:96-145`
- **Evidence:**
  `POST /api/v1/transactions/send` takes `SendTransactionRequest` which contains no `pin` field. PIN verification is executed via a separate endpoint `POST /verify-pin`, which defaults to accepting ANY digit string if a PIN was never configured (`pin == "1234" or pin.isdigit()`).
- **Impact:** Any client can call `POST /transactions/send` directly without ever calling `/verify-pin`, completely bypassing the transaction PIN requirement.
- **Recommended Fix:** Include `transaction_pin` directly in `SendTransactionRequest`, hash it with bcrypt/argon2, and verify it atomically on the server inside `send_money`.

### FINDING-37: Untrusted Client IP and Geolocation Header Injection
- **Severity:** HIGH (Integrity)
- **Location:** `backend/app/routes/api_v1/endpoints/transactions.py:103-108`
- **Evidence:**
  ```python
  client_ip = data.ip_address or request.headers.get("x-forwarded-for") or ...
  ```
- **Description:** The transaction initiation endpoint accepts `ip_address` directly from the client JSON payload, or falls back to an untrusted `x-forwarded-for` header without proxy validation.
- **Impact:** Callers can forge IP addresses to spoof locations, bypass geographic velocity checks, or maliciously trigger Impossible Travel fraud alerts on other accounts.
- **Recommended Fix:** Disallow client-provided `ip_address` in payloads; obtain IP strictly from the direct socket connection or a validated trusted proxy header.

### FINDING-38: Simulation Endpoints Creating Operational Records Without Simulation Flags
- **Severity:** MEDIUM (Integrity)
- **Location:** `backend/app/routes/api_v1/endpoints/simulation.py:63-71`, `106-114`
- **Evidence:** In `trigger_simulation_transaction` and `trigger_simulation_mule_chain`, calls to `txn_service.send_money(...)` do not specify `is_simulation=True`.
- **Impact:** Simulated demo transactions are stored with `is_simulation = False`, directly corrupting operational transaction ledgers and reports.
- **Recommended Fix:** Explicitly pass `is_simulation=True` and `scenario_id="demo_simulation"` in all simulation service calls.

### FINDING-39: Phantom WebSocket Alerts Disconnected from Persistence
- **Severity:** MEDIUM (Reliability)
- **Location:** `backend/app/routes/api_v1/endpoints/simulation.py:130-165`
- **Evidence:** `trigger_critical_alert` broadcasts a synthetic `FRAUD_ALERT_CREATED` event over WebSocket without inserting a record into `fraud_alerts`.
- **Impact:** When investigators click on the notification in the UI, subsequent queries for `/alerts/{alert_id}` fail with 404 Not Found.
- **Recommended Fix:** Persist the simulated alert in `fraud_alerts` with an `is_simulation` flag before broadcasting.

### FINDING-40: Missing Rate Limiting on Authentication and Sensitive Endpoints
- **Severity:** LOW (Hardening)
- **Location:** `backend/app/routes/api_v1/endpoints/auth.py`, `transactions.py`
- **Evidence:** No endpoints utilize SlowAPI rate limit decorators.
- **Impact:** Vulnerable to credential stuffing, brute-force PIN guessing, and transaction flooding.
- **Recommended Fix:** Apply rate limits (e.g. `@limiter.limit("5/minute")`) on `/auth/login`, `/transactions/set-pin`, and `/transactions/verify-pin`.
