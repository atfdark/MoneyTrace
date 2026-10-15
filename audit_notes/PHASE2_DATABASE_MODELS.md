# PHASE 2 AUDIT NOTES: Database Layer, Models, Schemas & Migrations

**Date:** 2026-10-14  
**Scope:** SQLAlchemy database models (`backend/app/models/*.py`), Pydantic schemas (`backend/app/schemas/*.py`), database engine (`backend/app/database.py`), and Alembic migrations (`backend/alembic/versions/*.py`).

---

## 1. Files Inspected in Phase 2

- `backend/app/database.py` (Inspected: async engine, lacks foreign keys PRAGMA and WAL mode)
- `backend/app/models/__init__.py` (Inspected: re-exports all models)
- `backend/app/models/user.py` (Inspected: User model, role enum, PG_UUID dialect)
- `backend/app/models/account.py` (Inspected: Account model, Decimal balance)
- `backend/app/models/transaction.py` (Inspected: Transaction model, Decimal amount, `is_simulation` field)
- `backend/app/models/fraud_alert.py` (Inspected: FraudAlert model; lacks `is_simulation` flag)
- `backend/app/models/recovery.py` (Inspected: RecoveryCase model; uses `Float` for `amount_at_risk`, lacks `is_simulation`)
- `backend/app/models/investigation.py` (Inspected: InvestigationCase & playbook models; uses `Float` for `total_amount`)
- `backend/app/models/scenario.py` (Inspected: ScenarioRun model)
- `backend/app/models/watchlist.py` (Inspected: WatchlistAccount model)
- `backend/app/models/audit_log.py` (Inspected: AuditLog model)
- `backend/app/schemas/transaction.py` (Inspected: SendTransactionRequest, allows client-defined `is_simulation`)
- `backend/app/services/transaction.py` (Inspected: `send_money` atomic transfer, `with_for_update` on SQLite, swallowed WS exception)
- `backend/app/services/dashboard_service.py` (Inspected: queries omit `is_simulation` filter, hardcoded fake metric fallback)
- `backend/alembic/env.py` (Inspected: imports `app.database.Base` triggering async engine creation)
- `backend/alembic/versions/2024_create_users_table.py` (Inspected)
- `backend/alembic/versions/2024_add_auth_fields_to_users.py` (Inspected: downgrade fails on SQLite index)
- `backend/alembic/versions/2024_create_accounts_transactions.py` (Inspected)
- `backend/alembic/versions/9fb551ddd598_add_scenario_provenance_to_transactions.py` (Inspected)
- `backend/alembic/versions/62bc1a4ced62_add_scenario_run_model.py` (Inspected)
- `backend/alembic/versions/c611d5081891_sync_missing_fields_safe.py` (Inspected: stripped alter_column, swallowed exceptions)

---

## 2. Findings Identified

### FINDING-12: Complete Absence of SQLite Foreign Key Enforcement
- **Severity:** HIGH (Integrity)
- **Location:** `backend/app/database.py:9-13`
- **Evidence:**
  ```python
  engine = create_async_engine(
      settings.DATABASE_URL,
      echo=settings.ENVIRONMENT == "development",
      future=True,
  )
  ```
- **Description:** SQLite disables foreign key constraint checking by default on every new database connection. SQLAlchemy requires an explicit event listener (`@event.listens_for(Engine, "connect")`) to execute `PRAGMA foreign_keys=ON;`. No such handler exists in `database.py`.
- **Impact:** Foreign key declarations (`ForeignKey("users.id", ondelete="CASCADE")`, `ForeignKey("accounts.id")`) are completely ignored. Deleting users or accounts leaves orphaned transactions and alerts. Broken references can be inserted freely.
- **Recommended Fix:** Add a connection listener on the SQLite engine to execute `PRAGMA foreign_keys=ON;` for all SQLite connections.

### FINDING-13: Alembic Downgrade/Rollback Failure on SQLite
- **Severity:** HIGH (Deployment / Operational)
- **Location:** `backend/alembic/versions/2024_add_auth_fields_to_users.py:53`
- **Evidence:** Running `alembic downgrade -1` produces:
  `sqlite3.OperationalError: (sqlite3.OperationalError) error in index ix_users_role after drop column: no such column: role [SQL: ALTER TABLE users DROP COLUMN role]`
- **Description:** The downgrade function attempts to drop the `role` column without dropping the index `ix_users_role` first. SQLite aborts column drops if an existing index references the column.
- **Impact:** Database migrations cannot be cleanly rolled back in local development or test staging environments.
- **Recommended Fix:** Drop `ix_users_role` before dropping column `role`, and enable Alembic's `batch_alter_table` context for SQLite operations.

### FINDING-14: Missing Database-Level Concurrency Controls (WAL Mode & Busy Timeout)
- **Severity:** MEDIUM
- **Location:** `backend/app/database.py:9-13`, `backend/app/services/transaction.py:136`
- **Evidence:** Transactions call `.with_for_update()`, which is unsupported by SQLite. SQLite runs in default `DELETE` journal mode without `PRAGMA journal_mode=WAL;` and without a configured busy timeout.
- **Impact:** Under concurrent loads (e.g. simulation execution alongside user transactions), SQLite locks the entire database file, throwing `sqlite3.OperationalError: database is locked`.
- **Recommended Fix:** Configure SQLite with `PRAGMA journal_mode=WAL;` and `PRAGMA busy_timeout=5000;`. Note that for true multi-user production, PostgreSQL must be used.

### FINDING-15: Inconsistent Precision and Monetary Storage (Float vs Decimal)
- **Severity:** MEDIUM
- **Location:** `backend/app/models/recovery.py:63`, `backend/app/models/investigation.py:68`
- **Evidence:**
  `RecoveryCase.amount_at_risk` is defined as `Float` (`recovery.py:63`).  
  `InvestigationCase.total_amount` is defined as `Float` (`investigation.py:68`).  
  `Account.balance` and `Transaction.amount` are defined as `DECIMAL(18, 2)`.
- **Impact:** Financial figures stored as binary floating-point numbers accumulate precision and rounding errors (e.g., $10,000.10 + $0.20 != $10,000.30 in IEEE 754), creating discrepancies between ledger amounts and recovery dossiers.
- **Recommended Fix:** Standardize all financial quantities to `DECIMAL(18, 2)` or integer minor units (cents/paise) across all models and schemas.

### FINDING-16: Alembic Startup Crash on Synchronous Database URLs
- **Severity:** MEDIUM
- **Location:** `backend/alembic/env.py:23`, `backend/app/database.py:9`
- **Evidence:** `alembic/env.py` unconditionally imports `from app.database import Base`, which immediately executes `create_async_engine(settings.DATABASE_URL)` at import time.
- **Impact:** If `DATABASE_URL` is set to a standard synchronous database URI (`sqlite:///...` or `postgresql://...`), running `alembic` commands crashes with `InvalidRequestError: The asyncio extension requires an async driver to be used`.
- **Recommended Fix:** Lazily initialize the SQLAlchemy engine or decouple `Base` from `engine` initialization so importing `Base` does not trigger engine creation.

### FINDING-17: Silent Failure and Swallowed DDL Exceptions in Migration c611d5081891
- **Severity:** MEDIUM
- **Location:** `backend/alembic/versions/c611d5081891_sync_missing_fields_safe.py:54-60`
- **Evidence:**
  ```python
  try:
      op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
  except Exception:
      pass
  ```
- **Description:** Index creation and schema alterations are wrapped in generic `try ... except Exception: pass` blocks without logging or re-raising.
- **Impact:** Failed migrations pass silently, leaving databases in incomplete or mismatched states without notifying administrators.
- **Recommended Fix:** Use proper Alembic inspector checks (`inspector.get_indexes()`) instead of catching and discarding all exceptions.

### FINDING-18: Simulation Contamination of Operational Dashboard Metrics
- **Severity:** HIGH (Product Constraint / Integrity)
- **Location:** `backend/app/services/dashboard_service.py:47-60`, `backend/app/models/fraud_alert.py`, `backend/app/models/recovery.py`
- **Evidence:**
  In `moneytrace.db`, all 34 recorded transactions have `is_simulation = 1`.
  `get_overview_stats()` queries:
  ```python
  txn_count_res = await self.session.execute(select(func.count(Transaction.id)))
  amount_res = await self.session.execute(
      select(func.sum(Transaction.amount)).where(
          Transaction.status == TransactionStatus.COMPLETED.value
      )
  )
  ```
  Neither query filters for `Transaction.is_simulation == False`. Furthermore, `FraudAlert` and `RecoveryCase` lack `is_simulation` columns.
- **Impact:** Simulated test scenarios directly inflate operational SOC metrics, fraud counts, and processed volume. Demonstrators and investigators cannot distinguish real activity from simulation in the main dashboard.
- **Recommended Fix:** Add `is_simulation` flag to `FraudAlert` and `RecoveryCase` (or join through `Transaction`), and enforce `where(Transaction.is_simulation == False)` on operational queries, providing an explicit filter toggle for simulation mode.

### FINDING-19: Fabricated Metric Fallback in Dashboard Service
- **Severity:** MEDIUM / ACCURACY
- **Location:** `backend/app/services/dashboard_service.py:121-124`
- **Evidence:**
  ```python
  txns_last_minute = txns_min_res.scalar_one() or 0
  if txns_last_minute == 0:
      # Fallback for simulator demo
      txns_last_minute = min(12, active_alerts * 2)
  ```
- **Description:** If no transactions occurred in the last minute, the backend invents a fake transaction count based on active alerts.
- **Impact:** Misleads investigators into believing live financial traffic is occurring when the system is actually idle.
- **Recommended Fix:** Return actual database counts (`0`) instead of generating synthetic metric numbers in the production service layer.

### FINDING-20: Client Manipulation of Simulation Provenance
- **Severity:** MEDIUM (Integrity)
- **Location:** `backend/app/schemas/transaction.py:26`, `backend/app/services/transaction.py:88`
- **Evidence:** `SendTransactionRequest` exposes `is_simulation: bool = Field(default=False)`.
- **Impact:** Any client calling `POST /transactions/send` can label real transactions as `is_simulation: true` or simulation transactions as `is_simulation: false`, evading detection or corrupting the audit trail.
- **Recommended Fix:** Remove `is_simulation` from user-facing transaction schemas; provenance must be assigned strictly by the server/scenario controller based on caller credentials and context.
