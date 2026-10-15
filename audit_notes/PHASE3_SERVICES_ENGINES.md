# PHASE 3 AUDIT NOTES: Backend Services, Detection Engines, Graph & Simulation

**Date:** 2026-10-14  
**Scope:** Core backend services (`backend/app/services/*.py`), fraud detection rules, ML classifier, NetworkX graph engine, recovery engine, scenario simulator, report generator, AI assistant, and GeoIP.

---

## 1. Files Inspected in Phase 3

- `backend/app/services/auth.py` (Inspected: mass assignment role elevation, in-memory token revocation)
- `backend/app/schemas/auth.py` (Inspected: `RegisterRequest` role field exposed)
- `backend/app/services/fraud_service.py` (Inspected: alert creation, unauthenticated WS broadcast, swallowed exceptions)
- `backend/app/services/fraud_rules.py` (Inspected: 8 fraud rules, scenario-scoped query filters, static INR thresholds)
- `backend/app/services/fraud_classifier.py` (Inspected: heuristic if-else scoring disguised as ML ensemble, artificial confidence floor)
- `backend/app/services/graph_engine.py` (Inspected: NetworkX graph construction without cache, unbounded cycle detection risk)
- `backend/app/services/recovery_engine.py` (Inspected: recovery probability rules, base score 50.0)
- `backend/app/services/recovery_service.py` (Inspected: fallback to arbitrary random transactions when alert txn missing)
- `backend/app/services/scenario_service.py` (Inspected: simulation user/account generation contaminating operational user ledger)
- `backend/app/services/report_generator.py` (Inspected: CSV formula injection, hardcoded fake chart data, unsegregated simulation export)
- `backend/app/services/ai_assistant.py` (Inspected: hardcoded fallback IDs, intent classification)
- `backend/app/services/rag_knowledge.py` (Inspected: static 6-document list, keyword counter regex disguised as RAG)
- `backend/app/services/case_similarity.py` (Inspected: hardcoded fake demo precedent fallback)
- `backend/app/services/geoip.py` (Inspected: MD5 modulo hashing to Indian hubs instead of real GeoIP)

---

## 2. Findings Identified

### FINDING-21: Unrestricted Privilege Escalation on User Registration (Mass Assignment)
- **Severity:** CRITICAL (CVSS 9.8)
- **Location:** `backend/app/schemas/auth.py:32`, `backend/app/services/auth.py:48`
- **Evidence:**
  In `RegisterRequest`:
  ```python
  role: UserRole = Field(default=UserRole.CUSTOMER)
  ```
  In `AuthService.register`:
  ```python
  user = User(
      id=uuid4(),
      full_name=data.full_name.strip(),
      email=email_clean,
      password_hash=hash_password(data.password),
      role=data.role,
      is_active=True,
  )
  ```
- **Description:** Registration accepts a `role` field directly from client JSON. An unauthenticated attacker can supply `{"role": "admin"}` or `{"role": "investigator"}` during public registration.
- **Impact:** Immediate full compromise of administrative and investigator privileges.
- **Recommended Fix:** Remove `role` from `RegisterRequest` or hardcode `role = UserRole.CUSTOMER`. Admin creation must be restricted to authenticated administrative endpoints.

### FINDING-22: Unchecked Fallback Query Assigns Arbitrary Transactions in Recovery Service
- **Severity:** HIGH (Integrity & Legal Risk)
- **Location:** `backend/app/services/recovery_service.py:54-60`, `188-198`
- **Evidence:**
  ```python
  if transaction is None:
      # Fallback to any recent transaction for testing/recalculation consistency
      fallback_res = await self.session.execute(select(Transaction).limit(1))
      transaction = fallback_res.scalar_one_or_none()
  ```
- **Description:** If the transaction associated with a fraud alert cannot be located, the service arbitrarily selects the first transaction from the database table and binds it to the recovery case.
- **Impact:** Recovery cases, amount at risk, and account freeze recommendations will target innocent users whose transactions happen to be first in the database.
- **Recommended Fix:** Raise `NotFoundError` immediately when an alert's corresponding transaction is missing; never substitute random database rows.

### FINDING-23: CSV Formula Injection (CWE-1236) in Transaction and Forensic Exports
- **Severity:** HIGH (CVSS 7.8)
- **Location:** `backend/app/services/report_generator.py:606-618`
- **Evidence:**
  ```python
  writer.writerow([
      t.transaction_id,
      t.sender_account.account_number if t.sender_account else "",
      t.receiver_account.account_number if t.receiver_account else "",
      float(t.amount),
      ...
      t.remark or "",
  ])
  ```
- **Description:** User-supplied transaction remarks (`SendTransactionRequest.remark`) are written verbatim to CSV exports without formula sanitization.
- **Impact:** If a user submits a transfer with remark `=cmd|'/c calc'!A1`, opening the resulting report in Excel executes the spreadsheet macro/command on the investigator's workstation.
- **Recommended Fix:** Prefix any text field beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single quote (`'`) to neutralize spreadsheet interpretation.

### FINDING-24: Simulation Contamination of Forensic Reports and Exports
- **Severity:** HIGH (Integrity)
- **Location:** `backend/app/services/report_generator.py:591-597`, `758-764`
- **Evidence:** Export queries select all rows from `Transaction` and `RecoveryCase` without `where(Transaction.is_simulation == False)`.
- **Impact:** All simulated scenario transactions and generated demo recovery cases are exported directly into official compliance reports.
- **Recommended Fix:** Filter export queries with `Transaction.is_simulation == False` by default, or provide an explicit export toggle.

### FINDING-25: Fabricated Forensic Statistics and Mock Charts in Production Reports
- **Severity:** MEDIUM / ACCURACY
- **Location:** `backend/app/services/report_generator.py:89-90`, `119-120`
- **Evidence:**
  ```python
  if not data:
      data = {"LOW": 10, "MEDIUM": 25, "HIGH": 35, "CRITICAL": 15}
  ...
  if not data:
      data = {"HIGH": 24, "MEDIUM": 18, "LOW": 8}
  ```
- **Description:** When the database lacks fraud alerts or recovery cases, report chart generators fabricate fake distribution numbers and plot them in generated PDF/DOCX files.
- **Impact:** Generates misleading regulatory and forensic artifacts with invented metrics.
- **Recommended Fix:** Render an explicit "No Data Available" placeholder chart instead of synthesizing fictitious numbers.

### FINDING-26: Heuristic Scoring Disguised as Machine Learning Ensemble
- **Severity:** MEDIUM / ACCURACY
- **Location:** `backend/app/services/fraud_classifier.py:17-83`
- **Evidence:**
  `model_version = "MoneyTrace-Ensemble-v1.2"`
  Confidence formula: `confidence = min(max(probs[best_type] * 1.6 + 15.0, 78.0), 96.5)`
- **Description:** The system documentation asserts that transactions are classified using a trained machine learning ensemble. The code actually uses hand-coded `if` statements and clamps confidence between 78% and 96.5%.
- **Impact:** Misrepresents heuristic rules as validated statistical ML confidence.
- **Recommended Fix:** Update documentation to accurately describe the component as a rule-based heuristics classifier, or train a genuine Scikit-learn/XGBoost pipeline.

### FINDING-27: Hardcoded Viva Demo Precedent Fallback in Case Similarity
- **Severity:** MEDIUM / ACCURACY
- **Location:** `backend/app/services/case_similarity.py:53-70`
- **Evidence:**
  ```python
  if not target_case or not candidates:
      # Generate representative similarity items for viva demo
      return [
          {
              "case_id": "REC202607180012",
              "similarity_percentage": 92.5,
              "shared_patterns": ["Large Transaction", "Mule Account Activity"],
              "outcome": "90% Recovered (INR 45,000 / 50,000)",
          }
      ]
  ```
- **Description:** When candidate cases do not exist, the service returns hardcoded precedent records designed for presentation demos.
- **Impact:** Presents fictional historical recovery outcomes as real intelligence precedents.
- **Recommended Fix:** Return an empty list (`[]`) when no historical cases match.

### FINDING-28: Algorithmic Denial of Service Risk in Graph Cycle Detection
- **Severity:** MEDIUM (Availability)
- **Location:** `backend/app/services/graph_engine.py:390-398`
- **Evidence:**
  ```python
  except Exception:
      for cycle in nx.simple_cycles(simple_digraph):
  ```
- **Description:** If bounded cycle search fails, the exception handler calls unbounded `nx.simple_cycles(simple_digraph)` which has exponential time complexity on dense cyclic graphs.
- **Impact:** Event loop freeze and CPU exhaustion causing Denial of Service under larger transaction networks.
- **Recommended Fix:** Always enforce `length_bound` on `simple_cycles` and execute heavy graph algorithms inside a background worker thread (`run_in_executor`).

### FINDING-29: Ephemeral In-Memory Token Revocation Store
- **Severity:** LOW
- **Location:** `backend/app/services/auth.py:20`
- **Evidence:** `_revoked_refresh_tokens: set[str] = set()`
- **Impact:** Refresh token revocation is lost upon server restart and fails across multiple Uvicorn worker processes.
- **Recommended Fix:** Store revoked token IDs (JTI) in Redis or a dedicated database table with automatic TTL expiration.

### FINDING-30: Synthetic GeoIP Resolution via MD5 Modulo Hashing
- **Severity:** LOW
- **Location:** `backend/app/services/geoip.py:109-122`
- **Evidence:**
  ```python
  ip_hash = int(hashlib.md5(clean_ip.encode()).hexdigest(), 16)
  hub_idx = ip_hash % len(INDIAN_HUB_GEOLOCATIONS)
  hub = INDIAN_HUB_GEOLOCATIONS[hub_idx]
  ```
- **Impact:** Foreign or unknown IP addresses are deterministically mapped to Indian cities, creating false "Impossible Travel" flags.
- **Recommended Fix:** Integrate MaxMind GeoLite2 database or an offline IP-to-country lookup library.
