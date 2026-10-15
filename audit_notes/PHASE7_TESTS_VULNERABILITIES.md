# MoneyTrace Audit Notes — Phase 7: Test Coverage, Static Analysis & Dependency Vulnerabilities

**Inspection Date:** 2026-10-14  
**Scope:** Automated test execution, test suite architecture, database isolation verification, npm vulnerability scan, and Python dependency risk assessment.  
**Auditor Mode:** Read-Only QA, Test Automation & Supply-Chain Security Assessor  

---

## 1. Executive Summary of Phase 7

Phase 7 executed the automated test suites in a strictly isolated, safe environment and conducted deep dependency audits across both the JavaScript and Python ecosystems.

### Key Verification Outcomes:
1. **Automated Unit Tests:** 13 unit tests passed across `test_dashboard.py`, `test_reports.py`, `test_fraud_engine.py`, `test_graph_engine.py`, and `test_ai_assistant.py` (`13 passed in 11.13s`).
2. **Defective Test Suite Architecture (Confirmed Missing DB Isolation):** `tests/test_scenario_pipeline.py` and `tests/test_scenario_endpoints.py` fail immediately (`OperationalError: no such table: users`) when run against a fresh database. They lack table-creation fixtures and connect directly to `app.database.async_session`. In default configurations, running pytest silently pollutes the developer's operational database (`moneytrace.db`) with test accounts and test users (`test_<uuid>@moneytrace.dev`).
3. **Model & Schema Desynchronization in Tests:** `test_dashboard.py:29-38` and `test_reports.py:29-38` contain explicit, hardcoded raw SQL workarounds (`ALTER TABLE fraud_alerts ADD COLUMN rule_breakdown JSON`, `ALTER TABLE recovery_cases ADD COLUMN assigned_to_id UUID`, etc.) executed after `Base.metadata.create_all` because the SQLAlchemy model definitions do not match the expected query schema.
4. **JavaScript Dependencies:** `npm audit` reported **15 vulnerabilities** (8 High, 7 Moderate) affecting `vite` (Windows path traversal & NTLMv2 hash leakage), `tailwindcss`, `postcss-selector-parser` (CPU exhaustion ReDoS), `source-map-js` (Event loop DoS), and `react-router-dom` (open redirect leading to XSS).
5. **Python Dependencies:** High supply-chain risks identified with abandoned packages: `python-jose` (unmaintained since 2021, cryptographic vulnerabilities; should be replaced with `PyJWT`) and `passlib` (unmaintained since 2020, incompatible with modern bcrypt versions). Additionally, 6 critical runtime dependencies are completely omitted from `backend/requirements.txt`.

---

## 2. Test Suite Execution Results

### Isolated Test Run 1: Core Analytics, Fraud, Graph & AI Tests
- **Command:** `$env:DATABASE_URL="sqlite+aiosqlite:///temp_test_isolated.db"; python -m pytest tests/test_dashboard.py tests/test_reports.py tests/test_fraud_engine.py tests/test_graph_engine.py tests/test_ai_assistant.py -v`
- **Working Directory:** `backend/`
- **Exit Code:** 0
- **Summary:** 13 passed, 0 failed, 0 skipped in 11.13s.
- **Passed Tests:**
  - `tests/test_dashboard.py::test_dashboard_overview_and_analytics`
  - `tests/test_reports.py::test_report_generation_suite`
  - `tests/test_fraud_engine.py::test_rule_1_large_transaction`
  - `tests/test_fraud_engine.py::test_rule_2_very_large_transaction`
  - `tests/test_fraud_engine.py::test_rule_3_rapid_transfers`
  - `tests/test_fraud_engine.py::test_rule_4_new_account_activity`
  - `tests/test_fraud_engine.py::test_rule_5_balance_drain`
  - `tests/test_fraud_engine.py::test_fraud_service_auto_alert_creation`
  - `tests/test_graph_engine.py::test_graph_construction_and_tracing`
  - `tests/test_graph_engine.py::test_circular_ring_detection`
  - `tests/test_ai_assistant.py::test_rag_compliance_knowledge`
  - `tests/test_ai_assistant.py::test_ml_fraud_pattern_classifier`
  - `tests/test_ai_assistant.py::test_ai_copilot_forensic_skills`

### Isolated Test Run 2: Scenario Pipeline & Endpoints
- **Command:** `$env:DATABASE_URL="sqlite+aiosqlite:///temp_test_isolated.db"; python -m pytest tests/test_scenario_endpoints.py tests/test_scenario_pipeline.py -v`
- **Working Directory:** `backend/`
- **Exit Code:** 1 (Failed)
- **Summary:** 0 passed, 2 errors in 8.98s.
- **Observed Error:**
  `sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such table: users`
- **Root Cause:**
  Tests import `app.database.async_session` directly without executing `Base.metadata.create_all()` or running Alembic migrations. They presuppose an already-populated database, proving that tests normally execute against and contaminate the primary developer database.

---

## 3. Dependency Security Vulnerability Summary

### JavaScript Ecosystem (`package.json`, `package-lock.json`)
*Audit Tool: `npm audit --json` (Node v22.23.1, npm 10.9.8, Date: 2026-10-14)*

| Vulnerability or Issue | Severity | Package & Affected Range | Advisory / CVE | Attack Scenario / Risk | Recommended Fix | Status |
|---|---|---|---|---|---|---|
| Windows `server.fs.deny` bypass | **High** | `vite` (`<=6.4.2`) | GHSA-fx2h-pf6j-xcff | Attacker on Windows host accesses files outside project root via alternate 8.3/UNC paths | Upgrade Vite to `>=6.4.3` or `>=8.x` | Confirmed |
| NTLMv2 Hash Disclosure | **Moderate** | `vite` (`<=6.4.2`) | GHSA-v6wh-96g9-6wx3 | UNC path traversal induces Windows client to send NTLM hash to external SMB share | Upgrade Vite to `>=6.4.3` | Confirmed |
| Path Traversal in Optimized Deps | **Moderate** | `vite` (`<=6.4.1`) | GHSA-4w7w-66w2-5vf9 | Unauthenticated read of arbitrary source map files | Upgrade Vite to `>=6.4.3` | Confirmed |
| Event Loop DoS via Section Offsets | **High** | `source-map-js` (`>=1.0.0 <1.2.2`) | GHSA-68fv-2mgg-jv7q | Malicious source map exhausts server/builder CPU | Upgrade `source-map-js` to `>=1.2.2` | Confirmed |
| Quadratic Selector Parsing DoS | **Moderate** | `postcss-selector-parser` (`<7.1.6`) | GHSA-rj75-hqrm-r3gf | Specially crafted CSS selector triggers infinite CPU loop | Upgrade `postcss-selector-parser` | Confirmed |
| Open Redirect Leading to XSS | **Moderate** | `react-router-dom` (`>=6.30.2 <=6.30.5`) | GHSA-jjmj-jmhj-qwj2 | Unsanitized backslash in URL allows redirect to attacker domain / javascript: URI | Upgrade `react-router-dom` to `>=7.x` or latest 6.x | Confirmed |
| Constructor Injection in SSR Hydration | **Moderate** | `react-router` (`>=6.4.0 <7.18.0`) | GHSA-337j-9hxr-rhxg | Arbitrary constructor injection via `deserializeErrors()` | Upgrade `react-router` | Confirmed |
| Missing Buffer Bounds Check | **Moderate** | `uuid` (`<11.1.1`) | GHSA-w5hq-g745-h8pq | Buffer overrun when user buffer provided to uuid v3/v5/v6 | Upgrade `uuid` to `>=11.1.1` | Confirmed |

### Python Ecosystem (`backend/requirements.txt`)

| Package | Status | Risk / Issue | Recommended Replacement |
|---|---|---|---|
| `python-jose[cryptography]` | **High** | Abandoned since 2021; multiple unpatched cryptographic issues; unmaintained ASN.1 parsing | Replace with maintained `PyJWT` |
| `passlib[bcrypt]` | **Moderate** | Abandoned since 2020; incompatible with modern `bcrypt>=4.0.0`; raises version parsing exceptions | Replace with direct `pwd_context` using `bcrypt` or `argon2-cffi` |
| `networkx` | **Omitted** | Imported across `graph_engine.py` and `routes/graph.py` but absent from `requirements.txt` | Add `networkx>=3.0` to `requirements.txt` |
| `reportlab` | **Omitted** | Imported in `report_generator.py` for PDF generation but absent from `requirements.txt` | Add `reportlab>=4.0.0` to `requirements.txt` |
| `python-docx` | **Omitted** | Imported in `report_generator.py` for DOCX generation but absent from `requirements.txt` | Add `python-docx>=1.1.0` to `requirements.txt` |
| `openpyxl` | **Omitted** | Imported in `report_generator.py` for Excel exports but absent from `requirements.txt` | Add `openpyxl>=3.1.0` to `requirements.txt` |
| `scikit-learn` | **Omitted** | Imported in `fraud_classifier.py` for RandomForestClassifier | Add `scikit-learn>=1.5.0` to `requirements.txt` |
| `slowapi` | **Omitted** | Imported in `routes/auth.py` for rate limiting | Add `slowapi>=0.1.9` to `requirements.txt` |
