# MoneyTrace REST API Reference & Specification

Base URL: `http://localhost:8000/api/v1`  
Interactive OpenAPI UI: `http://localhost:8000/docs`  
ReDoc UI: `http://localhost:8000/redoc`

---

## 1. Authentication & User Management (`/auth` & `/users`)

### 1.1 Register User
- **Method / URL**: `POST /api/v1/auth/register`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "analyst@moneytrace.dev",
  "password": "Password@123",
  "full_name": "Senior SOC Analyst",
  "role": "ANALYST"
}
```
- **Response (201 Created)**:
```json
{
  "user": {
    "id": "074f8eb7-be91-4c09-b3d9-764e66485210",
    "email": "analyst@moneytrace.dev",
    "full_name": "Senior SOC Analyst",
    "role": "ANALYST",
    "is_active": true
  },
  "tokens": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

### 1.2 Login
- **Method / URL**: `POST /api/v1/auth/login`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "admin@moneytrace.dev",
  "password": "Admin@123456"
}
```
- **Response (200 OK)**:
```json
{
  "user": { "id": "074f8eb7-...", "email": "admin@moneytrace.dev", "role": "ADMIN" },
  "tokens": { "access_token": "eyJhbGciOi...", "refresh_token": "eyJhbGciOi...", "token_type": "bearer", "expires_in": 1800 }
}
```

### 1.3 Get Current User Profile
- **Method / URL**: `GET /api/v1/auth/me`
- **Auth Required**: Yes (`Bearer <token>`)
- **Response (200 OK)**:
```json
{
  "id": "074f8eb7-be91-4c09-b3d9-764e66485210",
  "email": "admin@moneytrace.dev",
  "full_name": "Lead Investigator",
  "role": "ADMIN",
  "is_active": true
}
```

---

## 2. Banking Simulator & Transaction Engine (`/transactions`)

### 2.1 Create & Evaluate Transaction
- **Method / URL**: `POST /api/v1/transactions`
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "sender_account_number": "ACC1001",
  "receiver_account_number": "ACC1002",
  "amount": 95000.00,
  "remark": "Immediate RTGS settlement",
  "location": "Mumbai, IN",
  "device_info": "Samsung S24 Ultra"
}
```
- **Response (201 Created)**:
```json
{
  "transaction_id": "TXN_20260816051148545",
  "amount": 95000.00,
  "risk_score": 85.0,
  "is_flagged": true,
  "status": "COMPLETED",
  "timestamp": "2026-08-16T05:11:48.545Z"
}
```

### 2.2 List Transactions with Filters
- **Method / URL**: `GET /api/v1/transactions?limit=20&offset=0&is_flagged=true`
- **Auth Required**: Yes
- **Response (200 OK)**:
```json
{
  "transactions": [
    {
      "id": "bde0090b-8bc1-4e29-bcbe-e39d43893b47",
      "transaction_id": "TXN_TRACE_HOP1",
      "amount": 100000.00,
      "risk_score": 90.0,
      "is_flagged": true,
      "status": "COMPLETED"
    }
  ],
  "total": 5200
}
```

---

## 3. Fraud Detection & Alert Center (`/fraud`)

### 3.1 List Fraud Alerts
- **Method / URL**: `GET /api/v1/fraud/alerts?severity=CRITICAL&status=OPEN`
- **Auth Required**: Yes
- **Response (200 OK)**:
```json
{
  "alerts": [
    {
      "id": "184a8845-fe66-4ddc-a82d-53730a469d08",
      "alert_id": "ALT20260816051148545",
      "alert_type": "Large Transaction, Rapid Transfers",
      "risk_score": 85.0,
      "severity": "CRITICAL",
      "status": "OPEN",
      "rule_breakdown": {
        "rules_triggered": ["Large Transaction", "Rapid Transfers"],
        "score_breakdown": { "Large Transaction": 50.0, "Rapid Transfers": 35.0 }
      },
      "created_at": "2026-08-16T05:11:48Z"
    }
  ],
  "total": 120
}
```

### 3.2 Update Alert Status
- **Method / URL**: `PATCH /api/v1/fraud/alerts/{alert_id}/status`
- **Auth Required**: Yes (`INVESTIGATOR` or `ADMIN`)
- **Request Body**:
```json
{
  "status": "RESOLVED",
  "notes": "Beneficiary account frozen and funds recovered."
}
```
- **Response (200 OK)**: Updated alert object.

---

## 4. Money Flow Graph Analysis (`/graph`)

### 4.1 Trace Multi-Hop Fund Trail
- **Method / URL**: `GET /api/v1/graph/trace/{transaction_id_or_account}`
- **Auth Required**: Yes
- **Response (200 OK)**:
```json
{
  "source_account": "ACC1001",
  "money_path": ["ACC1002", "ACC1003", "ACC1004"],
  "current_holder": "ACC1004",
  "total_hops": 3,
  "initial_amount": 100000.00,
  "remaining_amount": 95000.00,
  "hops": [
    { "hop_number": 1, "from_account": "ACC1001", "to_account": "ACC1002", "amount": 100000.0, "timestamp": "2026-08-16T04:00:00Z" },
    { "hop_number": 2, "from_account": "ACC1002", "to_account": "ACC1003", "amount": 98000.0, "timestamp": "2026-08-16T04:15:00Z" },
    { "hop_number": 3, "from_account": "ACC1003", "to_account": "ACC1004", "amount": 95000.0, "timestamp": "2026-08-16T04:30:00Z" }
  ]
}
```

### 4.2 Detect Suspicious Laundering Cycles & Rings
- **Method / URL**: `GET /api/v1/graph/suspicious`
- **Auth Required**: Yes
- **Response (200 OK)**:
```json
{
  "cycles_detected": [["ACC1002", "ACC1003", "ACC1005", "ACC1002"]],
  "mule_accounts": ["ACC1002", "ACC1003"],
  "collector_accounts": ["ACC1004"]
}
```

---

## 5. Asset Recovery Intelligence (`/recovery`)

### 5.1 List Recovery Cases
- **Method / URL**: `GET /api/v1/recovery/cases`
- **Auth Required**: Yes
- **Response (200 OK)**:
```json
{
  "cases": [
    {
      "case_id": "REC202608168920",
      "alert_id": "ALT20260816051148545",
      "recovery_score": 85.0,
      "recovery_probability": "HIGH",
      "current_holder_account": "ACC1004",
      "amount_at_risk": 95000.00,
      "recommended_action": "Freeze ACC1004 immediately and file Section 91 CrPC notice.",
      "status": "OPEN"
    }
  ],
  "total": 60
}
```

---

## 6. Dashboard Analytics (`/dashboard`)

### 6.1 Executive Overview
- **Method / URL**: `GET /api/v1/dashboard/overview`
- **Response (200 OK)**:
```json
{
  "total_transactions": 5200,
  "total_volume": 45000000.00,
  "total_alerts": 120,
  "critical_alerts": 18,
  "open_recovery_cases": 45,
  "money_at_risk": 3850000.00,
  "money_recovered": 1250000.00
}
```

### 6.2 Real-Time SOC Live Stream Feed
- **Method / URL**: `GET /api/v1/dashboard/live`
- **Response (200 OK)**:
```json
{
  "active_alerts": 18,
  "transactions_last_minute": 42,
  "critical_alerts": 4,
  "money_at_risk": 450000.00
}
```

### 6.3 Composite Risk Accounts Leaderboard
- **Method / URL**: `GET /api/v1/dashboard/risky-accounts?limit=10`
- **Response (200 OK)**:
```json
{
  "risky_accounts": [
    {
      "account_number": "ACC1002",
      "composite_risk_score": 94.2,
      "avg_risk_score": 92.0,
      "alert_count": 8,
      "recovery_case_count": 4,
      "is_mule": true
    }
  ]
}
```

---

## 7. AI Investigator Assistant & Copilot (`/assistant`)

### 7.1 Conversational NLU Query
- **Method / URL**: `POST /api/v1/assistant/chat`
- **Request Body**:
```json
{
  "message": "Why was transaction TXN_TRACE_HOP1 flagged?"
}
```
- **Response (200 OK)**:
```json
{
  "answer": "Transaction TXN_TRACE_HOP1 was flagged because:\n• Large Transaction Rule triggered (+50 Risk)\n• Rapid Transfers Rule triggered (+25 Risk)\n\nPredicted Typology: Mule Account Activity (88.5% confidence)",
  "intent": "EXPLAIN_TRANSACTION",
  "predicted_fraud_type": "Mule Account Activity",
  "confidence_score": 88.5,
  "rag_citations": [
    { "doc_id": "RAG-RBI-001", "title": "RBI Master Direction (RBI/2021-22/108)", "relevance_score": 95.0 }
  ],
  "xai_weights": [
    { "feature": "Large Transaction", "weight": 50.0, "impact": "CRITICAL" },
    { "feature": "Rapid Transfers", "weight": 25.0, "impact": "POSITIVE" }
  ],
  "similar_cases": [
    { "case_id": "REC202608161586", "similarity_percentage": 96.0, "fraud_type": "Mule Forwarding" }
  ],
  "recommendations": [
    "1. Freeze destination account immediately",
    "2. Issue Section 91 CrPC notice"
  ]
}
```

### 7.2 RAG Compliance Knowledge Search
- **Method / URL**: `GET /api/v1/assistant/rag-search?query=RBI+unauthorized+fraud`
- **Response (200 OK)**: List of cited circulars with relevance percentage.

---

## 8. Reports & Export Engine (`/reports`)

| Method & Endpoint | Description | Content-Type |
| :--- | :--- | :--- |
| `GET /api/v1/reports/investigation/{case_id}/pdf` | Court-admissible PDF investigation dossier | `application/pdf` |
| `GET /api/v1/reports/investigation/{case_id}/docx` | Editable Microsoft Word investigation dossier | `application/vnd.openxmlformats-...` |
| `GET /api/v1/reports/fraud/{alert_id}/pdf` | Fraud incident PDF report with severity chart | `application/pdf` |
| `GET /api/v1/reports/dashboard/pdf` | Executive dashboard PDF summary | `application/pdf` |
| `GET /api/v1/reports/export/transactions` | Full transactions CSV export | `text/csv` |
| `GET /api/v1/reports/export/alerts` | Full fraud alerts CSV export | `text/csv` |
| `GET /api/v1/reports/export/recovery` | Full recovery cases CSV export | `text/csv` |
| `GET /api/v1/reports/export/dashboard` | Master multi-sheet Excel (.xlsx) workbook | `application/vnd.openxmlformats-...` |
| `GET /api/v1/reports/history` | List of generated report files in archive | `application/json` |
