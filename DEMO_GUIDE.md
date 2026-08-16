# MoneyTrace Live Demonstration & Viva Presentation Guide

This guide provides a structured, step-by-step walkthrough script for demonstrating **MoneyTrace** to faculty examiners, project evaluators, teammates, and recruiters.

---

## 🎬 8-Step Presentation Script

```text
Step 1: Authenticate as Lead SOC Investigator
Step 2: Executive SOC Dashboard & Real-Time Monitoring
Step 3: Banking Simulator — Execute Instant Fraud Attack
Step 4: Alert Center — Triage Rule Contributions
Step 5: Money Flow Graph — Trace Multi-Hop Fund Path
Step 6: Asset Recovery — Evaluate Recovery Probability
Step 7: AI Copilot Pro — Forensic Query & RAG Citations
Step 8: Reports & Export — 1-Click Court Dossier Download
```

---

### Step 1: Login & Identity Initialization
1. Navigate to `http://localhost:5173`.
2. Enter Lead Investigator credentials:
   - **Email**: `admin@moneytrace.dev`
   - **Password**: `Admin@123456`
3. Click **Sign In**.
4. **Talking Point**:
   > *"MoneyTrace enforces Role-Based Access Control (RBAC) with HMAC-SHA256 JWT tokens, protecting sensitive financial crime dossiers and legal freeze commands."*

---

### Step 2: Executive SOC Dashboard (`/dashboard`)
1. View the **Overview KPIs**:
   - Total Transactions Processed: `5,200+`
   - Fraud Alerts: `120+` (with Critical Alert counter)
   - Money at Risk vs. Recovered amounts.
2. Inspect the **30-Day Fraud Trend Line** and **Severity Distribution Pie**.
3. Point out the **Composite Risk Accounts Leaderboard**:
   - Show how composite score unites average risk, alert frequency, and recovery cases.
4. **Talking Point**:
   > *"The dashboard acts as a real-time Security Operations Center (SOC), providing high-level situational awareness across thousands of high-velocity transactions."*

---

### Step 3: Banking Simulator & Triggering Fraud (`/transactions`)
1. Navigate to **Transactions**.
2. Click **New Transaction**:
   - **Sender**: `ACC1001`
   - **Receiver**: `ACC1002`
   - **Amount**: `₹100,000`
   - **Remark**: `Urgent cash transfer`
3. Click **Send Funds**.
4. **Observe Output**:
   - Instant transaction status: `COMPLETED`
   - Risk Score flagged: `90/100 (CRITICAL)`
   - Alert generated: `Large Transaction + Rapid Transfers`

---

### Step 4: Alert Center & Rule Triage (`/alerts`)
1. Navigate to **Alerts**.
2. Open the newly generated alert `ALT...`.
3. Inspect the **Explainable Rule Breakdown**:
   - `Large Transaction` = `+50 Risk`
   - `Rapid Transfers` = `+25 Risk`
   - `Mule Account Activity` = `+15 Risk`
4. Demonstrate Status Workflow: Change status from `OPEN` $\rightarrow$ `INVESTIGATING`.

---

### Step 5: Money Flow Graph & Circular Ring Detection (`/flow`)
1. Navigate to **Money Flow Graph**.
2. Enter Transaction ID `TXN_TRACE_HOP1` or Account `ACC1001`.
3. Click **Trace Money Flow**.
4. **Observe Output**:
   - Visual multi-hop path: `ACC1001` $\rightarrow$ `ACC1002` $\rightarrow$ `ACC1003` $\rightarrow$ `ACC1004`
   - Current Holder Node: `ACC1004`
   - Total Hops: `3` | Preserved Balance: `₹95,000.00`
5. Switch to **Suspicious Cycles** view to show circular laundering detection ($A \rightarrow B \rightarrow C \rightarrow A$).

---

### Step 6: Asset Recovery Intelligence (`/recovery`)
1. Navigate to **Asset Recovery**.
2. Select Case `REC202608168920`.
3. **Inspect Output**:
   - Recovery Score: `85 / 100 (HIGH PROBABILITY)`
   - Holding Node Identified: `ACC1004`
   - Mandatory Directive: *"Freeze ACC1004 immediately and file Section 91 CrPC notice."*
4. **Talking Point**:
   > *"MoneyTrace does not stop at alert detection; it formulates mathematical recovery feasibility scores to help banks intercept stolen funds before off-ramping."*

---

### Step 7: AI Investigator Assistant / Copilot (`/chat`)
1. Navigate to **AI Copilot**.
2. Click the quick suggestion chip:  
   `"Why was transaction TXN_TRACE_HOP1 flagged?"`
3. **Observe AI Response**:
   - Natural language explanation of triggered rules
   - **ML Typology Badge**: `Mule Account Activity (88.5% Confidence)`
   - **XAI Feature Importance Bars**: Visual weight contribution chart
   - **RAG Regulatory Citations**: `[RAG-RBI-001]` RBI Customer Protection Circular & PMLA Section 12
   - **Investigator Action Checklist**: Ordered checkboxes for immediate debit freezes
4. Switch to **RAG Compliance** tab and search `"RBI unauthorized fraud"` to show offline policy retrieval.

---

### Step 8: Reports & Multi-Format Export (`/reports`)
1. Navigate to **Reports & Export Center**.
2. Under **Investigation Dossier**, enter `REC202608168920`.
3. Click **Download PDF**:
   - Open downloaded PDF to display styled investigation tables, legal notice boxes, and embedded Matplotlib recovery chart.
4. Click **Download DOCX**:
   - Open Microsoft Word brief.
5. Click **Master Excel (.xlsx)**:
   - Display multi-sheet workbook (`Overview`, `Transactions`, `Fraud Alerts`, `Recovery Cases`, `Risky Accounts`).
6. Click **Transactions CSV** to show instant raw data streaming.

---

## 🏆 Summary Viva Key Takeaways

1. **Unique Selling Proposition (USP)**:
   $$\text{MoneyTrace} = \text{Transaction Engine} + \text{Fraud Detection} + \text{NetworkX Graph Tracing} + \text{Asset Recovery} + \text{AI Forensic Copilot}$$
2. **100% Offline Resilience**: Zero reliance on external cloud APIs or paid LLM tokens — runs seamlessly on local SQLite and local ML/RAG models.
3. **Admissibility**: Generates formal reports citing RBI Master Directions and Section 91 CrPC notices.
