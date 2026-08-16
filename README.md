# MoneyTrace — AI Financial Crime Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)](https://vitejs.dev/)
[![NetworkX](https://img.shields.io/badge/NetworkX-3.0-orange.svg)](https://networkx.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **MoneyTrace** is an enterprise-grade financial crime intelligence platform uniting real-time transaction processing, behavioral fraud scoring, NetworkX graph flow analysis, asset recovery intelligence, forensic AI reasoning (RAG & XAI), and court-admissible multi-format reporting.

---

## 🌟 Unique Selling Proposition (USP)

```text
MoneyTrace
=
Transaction Tracking + Fraud Detection + Money Flow Graph + Recovery Intelligence + AI Copilot Pro
```

---

## 📚 Technical Documentation Index

All in-depth architectural and technical specifications are organized in the [`docs/`](file:///f:/codee/MoneyTrace/docs) directory:

| Document | Description |
| :--- | :--- |
| [**SYSTEM_ARCHITECTURE.md**](file:///f:/codee/MoneyTrace/docs/SYSTEM_ARCHITECTURE.md) | High-level system topology, protocol definitions & component interactions |
| [**AI_ENGINE_DOCUMENTATION.md**](file:///f:/codee/MoneyTrace/docs/AI_ENGINE_DOCUMENTATION.md) | Fraud rule heuristics, NetworkX graph algorithms, RAG engine & XAI |
| [**DATABASE_SCHEMA.md**](file:///f:/codee/MoneyTrace/docs/DATABASE_SCHEMA.md) | Entity Relationship (ER) diagrams, table structures, and indexes |
| [**DATA_FLOW.md**](file:///f:/codee/MoneyTrace/docs/DATA_FLOW.md) | End-to-end data pipeline, state machines & message lifecycles |
| [**API_REFERENCE.md**](file:///f:/codee/MoneyTrace/docs/API_REFERENCE.md) | Complete OpenAPI / REST API route specifications |
| [**PROJECT_STRUCTURE.md**](file:///f:/codee/MoneyTrace/docs/PROJECT_STRUCTURE.md) | Repository organization and module breakdown |
| [**INSTALLATION_GUIDE.md**](file:///f:/codee/MoneyTrace/docs/INSTALLATION_GUIDE.md) | Full setup, environment, and deployment manual |
| [**DEMO_GUIDE.md**](file:///f:/codee/MoneyTrace/docs/DEMO_GUIDE.md) | Evaluator / Viva demonstration flow script |
| [**CLEANUP_REPORT.md**](file:///f:/codee/MoneyTrace/docs/CLEANUP_REPORT.md) | Codebase audit and resource health summary |

---

## 🚀 Key Modules & Capabilities

### 1. Banking Simulator & Real-Time Transaction Engine
- High-throughput ledger recording transfer amounts, IP addresses, location vectors, and device fingerprints.
- Sub-millisecond fraud scoring and automatic flagging.

### 2. Behavioral Fraud Detection Engine
- Evaluates **8 deterministic and behavioral scoring rules**:
  - `Large Transaction (>₹50k)`
  - `Rapid Transfers Velocity`
  - `New Account High-Value Activity`
  - `Balance Drain Anomaly`
  - `Impossible Travel & Geographic Velocity`
  - `Device / IMEI Fingerprint Change`
  - `Mule Account Forwarding Funnels`
  - `Failed Inbound Velocity`
- Generates JSON rule attribution breakdowns with severity tiers (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

### 3. Money Flow Graph Analysis (NetworkX)
- Constructs in-memory directed multi-graphs ($G=(V,E)$) of accounts and transfers.
- **Multi-Hop Path Tracing**: Traces stolen money across dozens of mule layers to identify the **exact current holding account**.
- **Circular Laundering Detection**: Extracts strongly connected components and simple cycles to uncover money-laundering rings.
- **Mule & Collector Hub Classification**: Detects accounts exhibiting high passthrough velocities.

### 4. Asset Recovery Intelligence Engine
- Calculates asset preservation scores ($0\text{ to }100$) and assigns probability ratings (`HIGH`, `MEDIUM`, `LOW`).
- Formulates legal notice directives under **Section 91 CrPC** and inter-bank fraud registries to freeze holding accounts before cash-out.

### 5. AI Investigator Assistant (MoneyTrace Copilot Pro)
- **100% Offline Forensic NLU Reasoning**.
- **RAG Compliance Knowledge**: Integrated search over RBI Master Directions (`RBI/2021-22/108`), PMLA Section 12, and I4C Mule matrices.
- **ML Typology Classifier**: Categorizes transfers into 6 financial crime patterns.
- **Explainable AI (XAI)**: Visual mathematical risk attribution bar charts.
- **Case Similarity Engine**: Multi-dimensional cosine matching against historical precedent cases.

### 6. Reports & Multi-Format Export Engine
- Court-admissible **PDF Dossiers** with embedded Matplotlib charts (`reportlab`).
- Editable Microsoft Word **DOCX Briefs** (`python-docx`).
- Multi-sheet Executive **Excel Workbooks** (`openpyxl`).
- High-speed raw **CSV Data Streams**.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Presentation Layer [React 18 + Vite + Tailwind CSS]
        UI[SOC Dashboard • Graph Visualizer • Alert Center • AI Copilot • Reports]
    end

    subgraph API Gateway [FastAPI Backend]
        Router[API Router /api/v1]
        Auth[JWT Security & RBAC]
    end

    subgraph Intelligence Core [Python Services]
        Fraud[Fraud Detection Engine]
        Graph[NetworkX Graph Engine]
        Recovery[Recovery Intelligence]
        Copilot[AI Forensic Copilot + RAG + XAI]
        Reports[Report & Chart Generator]
    end

    subgraph Persistence Layer [Async SQLite / PostgreSQL]
        DB[(moneytrace.db)]
        Storage[storage/reports/<br/>PDF, DOCX, CSV, XLSX, Charts]
    end

    UI --> Router
    Router --> Auth
    Auth --> Intelligence Core
    Intelligence Core --> DB
    Reports --> Storage
```

---

## 💻 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, TanStack React Query, Axios, Lucide / Material Symbols.
- **Backend**: FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, Python-Jose (JWT), Passlib.
- **Graph & AI Analytics**: NetworkX, Scikit-learn, Matplotlib, RAG Engine, Explainable AI (XAI).
- **Document Exporters**: ReportLab (PDF), Python-Docx (Word), OpenPyXL (Excel), CSV.
- **Database**: SQLite 3 (Async via aiosqlite).

---

## ⚡ Quickstart Guide

### 1. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt
pip install reportlab python-docx openpyxl matplotlib

# Seed sample data (5,200 txns, 120 alerts, 50 recovery cases)
python scripts/seed_dashboard_data.py
python scripts/seed_graph_data.py
python scripts/seed_recovery_cases.py
python scripts/seed_ai_chat.py
python scripts/seed_reports_data.py

# Start FastAPI server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup
```bash
# In the root directory (f:\codee\MoneyTrace)
npm.cmd install
npm.cmd run dev
```

- **Web Application**: `http://localhost:5173`
- **Swagger API Docs**: `http://127.0.0.1:8000/docs`

---

## 🔑 Default Investigator Credentials

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Lead Investigator (Admin)** | `admin@moneytrace.dev` | `Admin@123456` | Full platform access, report generation, asset freezes |
| **SOC Analyst** | `analyst@moneytrace.dev` | `Analyst@123456` | Alert triage, case investigation, graph flow |

---

## 🧪 Automated Test Verification

```bash
cd backend
python scripts/test_graph_endpoints.py
python scripts/test_recovery_endpoints.py
python scripts/test_dashboard_endpoints.py
python scripts/test_assistant_endpoints.py
python scripts/test_reports_endpoints.py
```

---

## 📸 Platform Screenshots

Screenshots and UI designs are stored in [`docs/screenshots/`](file:///f:/codee/MoneyTrace/docs/screenshots):

- `docs/screenshots/dashboard_overview.png` — SOC Dashboard with volume trends & risk metrics
- `docs/screenshots/flow_visualization.png` — Multi-hop directed fund flow graph & cycle detection
- `docs/screenshots/alert_center.png` — Real-time fraud alert triage & rapid action controls
- `docs/screenshots/investigation_deep_dive.png` — Forensic case analysis & evidence locker
- `docs/screenshots/live_monitor.png` — Real-time transaction ingestion telemetry
- `docs/screenshots/recovery_intel.png` — Asset preservation scoring & nodal freeze notices
- `docs/screenshots/login_screen.png` — Secure role-based investigator login interface

---

## 👥 Project Team

- **Lead Developer / Architect**: MoneyTrace Core Team
- **Domain**: Financial Crime & Forensic Intelligence

---

## 🔮 Future Roadmap

- [ ] Live WebSocket transaction ingestion from real banking switches (ISO 8583 / ISO 20022).
- [ ] GNN (Graph Neural Network) based automated money laundering ring classification.
- [ ] Direct API bridge with FIU-IND Finnet 2.0 and I4C National Cyber Crime Reporting Portal.
- [ ] Automated court Section 91 CrPC notice generation with cryptographic digital signatures.
