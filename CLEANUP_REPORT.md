# MoneyTrace Repository Cleanup Report

This report provides a comprehensive audit of the MoneyTrace codebase across the root, frontend (`src/`), and backend (`backend/`) layers. It catalogs unused assets, redundant artifacts, duplicate helpers, and provides safe cleanup recommendations.

---

## 1. Executive Summary

| Audit Category | Items Identified | Action Recommendation | Risk Level |
| :--- | :--- | :--- | :--- |
| **Image Generation Folders** | 8 generated mockup folders in root | Move to `docs/assets/` or delete | Low |
| **Old/Duplicate Model Files** | `backend/models.py` (legacy stub) | Safe to delete (uses `app/models/`) | Zero |
| **Root Placeholder Artifacts** | `app/` directory in root (empty/legacy) | Safe to delete (backend is in `backend/`) | Zero |
| **Temporary Pytest Caches** | `.pytest_cache/`, `__pycache__/` | Add to `.gitignore` | Zero |
| **Generated Reports Cache** | `backend/storage/reports/*` | Keep storage structure, clean generated samples | Low |

---

## 2. Detailed File-by-File Cleanup Recommendations

### A. Root Directory Files & Legacy Stubs

| File / Folder Path | Description | Reason for Action | Safe To Delete? | Dependency Impact |
| :--- | :--- | :--- | :---: | :--- |
| `f:\codee\MoneyTrace\backend\models.py` | 130 bytes legacy single-file model stub | `app/models/` package is the active source of truth. | **Yes** | None. `app.main` imports from `app.models`. |
| `f:\codee\MoneyTrace\app\` | Legacy root directory created during initial scaffold | Backend logic is strictly maintained inside `backend/app/`. | **Yes** | None. |
| `f:\codee\MoneyTrace\a_high_tech_professional_digital_illustration_...` | Tool artifact image export folder | Generated mockup asset folder from initial UI prototyping. | **Yes** | Move key PNGs to `docs/assets/` if needed for README. |
| `f:\codee\MoneyTrace\moneytrace_alert_center` | Tool artifact image export folder | Prototype UI visual snapshot folder. | **Yes** | Move to `docs/screenshots/`. |
| `f:\codee\MoneyTrace\moneytrace_dashboard` | Tool artifact image export folder | Prototype UI visual snapshot folder. | **Yes** | Move to `docs/screenshots/`. |
| `f:\codee\MoneyTrace\moneytrace_flow_visualization` | Tool artifact image export folder | Prototype UI visual snapshot folder. | **Yes** | Move to `docs/screenshots/`. |
| `f:\codee\MoneyTrace\moneytrace_intelligence` | Tool artifact image export folder | Prototype UI visual snapshot folder. | **Yes** | Move to `docs/screenshots/`. |
| `f:\codee\MoneyTrace\moneytrace_investigation_deep_dive` | Tool artifact image export folder | Prototype UI visual snapshot folder. | **Yes** | Move to `docs/screenshots/`. |
| `f:\codee\MoneyTrace\moneytrace_live_monitor` | Tool artifact image export folder | Prototype UI visual snapshot folder. | **Yes** | Move to `docs/screenshots/`. |
| `f:\codee\MoneyTrace\moneytrace_login` | Tool artifact image export folder | Prototype UI visual snapshot folder. | **Yes** | Move to `docs/screenshots/`. |
| `f:\codee\MoneyTrace\moneytrace_logo` | Tool artifact image export folder | Prototype UI visual snapshot folder. | **Yes** | Move to `docs/screenshots/`. |
| `f:\codee\MoneyTrace\moneytrace_recovery_intel` | Tool artifact image export folder | Prototype UI visual snapshot folder. | **Yes** | Move to `docs/screenshots/`. |

---

### B. Backend Services & Routes Audit

| Component | Status | Verification & Active Role | Action |
| :--- | :---: | :--- | :--- |
| `backend/app/services/fraud_engine.py` | **ACTIVE** | Core 8-rule fraud detection engine. | Keep intact. |
| `backend/app/services/graph_engine.py` | **ACTIVE** | NetworkX multi-hop money flow & cycle analyzer. | Keep intact. |
| `backend/app/services/recovery_engine.py` | **ACTIVE** | Asset recovery probability math & scoring rules. | Keep intact. |
| `backend/app/services/recovery_service.py` | **ACTIVE** | High-level recovery case coordinator. | Keep intact. |
| `backend/app/services/dashboard_service.py` | **ACTIVE** | High-performance aggregations & SOC analytics. | Keep intact. |
| `backend/app/services/rag_knowledge.py` | **ACTIVE** | RAG compliance engine for RBI, PMLA, Bank SOPs. | Keep intact. |
| `backend/app/services/fraud_classifier.py` | **ACTIVE** | ML fraud pattern typology classifier. | Keep intact. |
| `backend/app/services/case_similarity.py` | **ACTIVE** | Historical precedent cosine similarity matcher. | Keep intact. |
| `backend/app/services/ai_assistant.py` | **ACTIVE** | AI Copilot NLU orchestrator & forensic assistant. | Keep intact. |
| `backend/app/services/report_generator.py` | **ACTIVE** | PDF, DOCX, CSV, and XLSX generator with Matplotlib. | Keep intact. |

---

### C. Seed & Test Scripts Inventory

| Script | Purpose | Retention Recommendation |
| :--- | :--- | :--- |
| `backend/scripts/seed_dashboard_data.py` | Seeds 5,200+ historical transactions across 35 days | **Retain** (Essential for full demo) |
| `backend/scripts/seed_graph_data.py` | Seeds multi-hop laundering and circular rings | **Retain** (Demo data) |
| `backend/scripts/seed_recovery_cases.py` | Seeds 50+ recovery cases with assigned analysts | **Retain** (Demo data) |
| `backend/scripts/seed_ai_chat.py` | Seeds realistic investigator Q&A sessions | **Retain** (Demo data) |
| `backend/scripts/seed_reports_data.py` | Pre-generates PDF, DOCX, CSV, and XLSX files | **Retain** (Demo data) |
| `backend/scripts/test_*_endpoints.py` | 5 comprehensive integration test scripts | **Retain** (Automated verification) |

---

## 3. Recommended Clean Repository Layout

```text
MoneyTrace/
├── .gitignore
├── README.md                      # Master Overview & Viva Guide
├── PROJECT_STRUCTURE.md           # Deep Folder & File Hierarchy
├── SYSTEM_ARCHITECTURE.md         # Architecture, Protocols & Layers
├── DATA_FLOW.md                   # Sequence & State Machine Flows
├── DATABASE_SCHEMA.md             # ER Diagrams & Column Specifications
├── API_REFERENCE.md               # Complete REST API Specifications
├── AI_ENGINE_DOCUMENTATION.md     # Fraud, Graph, Recovery & AI Copilot Docs
├── INSTALLATION_GUIDE.md          # Setup Instructions
├── DEMO_GUIDE.md                  # Viva / Recruiter Demo Script
├── CLEANUP_REPORT.md              # Codebase Audit
├── index.html                     # Vite Root HTML
├── package.json                   # Frontend Dependencies & Scripts
├── tsconfig.json                  # TypeScript Compiler Config
├── vite.config.ts                 # Vite Server & Proxy Config
├── tailwind.config.js             # Theme & Design Tokens
├── src/                           # React Frontend Source
│   ├── api/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── types/
│   └── utils/
└── backend/                       # FastAPI Backend Source
    ├── app/
    │   ├── core/
    │   ├── database.py
    │   ├── models/
    │   ├── routes/
    │   ├── schemas/
    │   └── services/
    ├── scripts/
    ├── storage/
    └── tests/
```
