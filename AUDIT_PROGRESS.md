# MONEYTRACE AUDIT PROGRESS & FILE INVENTORY

**Audit Date:** 2026-10-14  
**Audit Target:** MoneyTrace Repository (`c:\Users\alokk\OneDrive\Desktop\CODE\MoneyTrace`)  
**Auditor Mode:** Read-Only Application Security, Code Quality, Database & Deployment Auditor  

---

## 1. Audit Phase Plan

- [x] **Phase 1: Environment, Configuration, Dependencies & Repository Hygiene** [COMPLETED]
  - Dependency manifests (`package.json`, `package-lock.json`, `backend/requirements.txt`)
  - Config files (`vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `backend/alembic.ini`, `.gitignore`)
  - Secrets & Environment templates (`.env.example`, hardcoded secrets check)
  - Committed database files (`moneytrace.db`, `backend/*.db`) & logs (`e2e_server.log`, `graph_test_output.txt`)
  - Scratch scripts in backend (`scratch_*.py`, `clean_database.py`)
- [x] **Phase 2: Database Layer, Models, Schemas & Migrations** [COMPLETED]
  - Database connection & engine (`backend/app/database.py`, `backend/app/config.py`)
  - SQLAlchemy models (`backend/app/models/*.py`)
  - Pydantic schemas (`backend/app/schemas/*.py`)
  - Alembic migrations (`backend/alembic/versions/*.py`, `backend/alembic/env.py`)
  - Type integrity (Float vs Decimal for currency, Boolean handling in SQLite, FK constraints)
- [x] **Phase 3: Backend Services, Detection Engine, Graph & Simulation** [COMPLETED]
  - Fraud rules & classifier (`fraud_rules.py`, `fraud_classifier.py`, `fraud_service.py`)
  - Graph engine & NetworkX analytics (`graph_engine.py`)
  - Recovery engine & workflows (`recovery_engine.py`, `recovery_service.py`)
  - Scenario simulation & provenance segregation (`scenario_service.py`, `transaction.py`)
  - Reporting generator (`report_generator.py`)
  - AI Copilot / RAG services (`ai_assistant.py`, `rag_knowledge.py`, `case_similarity.py`, `geoip.py`)
  - Auth services (`backend/app/services/auth.py`)
  - Backend utility scripts (`backend/scripts/*.py`)
- [x] **Phase 4: Backend API Routes, Core Middleware & Security** [COMPLETED]
  - FastAPI app lifecycle & CORS (`backend/app/main.py`)
  - Security, JWT, hashing, deps (`backend/app/core/security.py`, `core/deps.py`, `core/exceptions.py`, `core/responses.py`)
  - WebSocket hub & events (`backend/app/core/websocket.py`, `core/websocket_events.py`)
  - All API routes (`backend/app/routes/root.py`, `backend/app/routes/api_v1/endpoints/*.py` - 15 endpoint modules)
  - Role-based access control, IDOR / BOLA analysis, input validation
- [x] **Phase 5: Frontend Architecture, Services, Components & State** [COMPLETED]
  - API client & Axios interceptors (`src/api/*`)
  - Auth context, token lifecycle & routing (`src/contexts/*`, `src/App.tsx`, `src/components/common/ProtectedRoute.tsx`)
  - Frontend services (`src/services/*.ts`)
  - Hooks (`src/hooks/*.ts` including `useWebSocket.ts`)
  - Pages (`src/pages/*.tsx`, `src/pages/customer/*.tsx`)
  - Key components (`src/components/dashboard/*`, `src/components/graph/*`, `src/components/investigation/*`, `src/components/recovery/*`, `src/components/reports/*`, `src/components/alerts/*`, `src/components/transactions/*`, `src/components/layout/*`)
  - Financial data separation & simulation display integrity
- [x] **Phase 6: Links & External References Comprehensive Audit** [COMPLETED]
  - Full scan of URLs, CDNs, external scripts, textures, fonts, maps, endpoints across all files
  - Verification of reachability, security, and validity
- [x] **Phase 7: Test Coverage, Static Analysis & Dependency Vulnerabilities** [COMPLETED]
  - Python tests (`backend/tests/test_*.py`)
  - E2E / UI tests (`tests/*.spec.ts`)
  - Dependency vulnerability scans (`npm audit`, python packages check)
  - Isolated test execution (safe, non-destructive)
- [x] **Phase 8: Synthesis & Final Comprehensive Audit Report** [COMPLETED]
  - Consolidated report generation according to prompt format (`audit_notes/FINAL_AUDIT_REPORT.md`)

---

## 2. Complete File Inventory Checklist

### Category A: Root Configuration & Metadata
| File Path | Status | Notes |
|---|---|---|
| `.gitignore` | Inspected | Missing *.db, *.log |
| `index.html` | Inspected | Root HTML template |
| `package.json` | Inspected | Node frontend dependencies |
| `package-lock.json` | Inspected | Node lockfile |
| `postcss.config.js` | Inspected | PostCSS config |
| `README.md` | Inspected | Root project documentation |
| `tailwind.config.js` | Inspected | Tailwind CSS config |
| `tsconfig.json` | Inspected | TypeScript config |
| `tsconfig.node.json` | Inspected | Vite Node TS config |
| `vite.config.ts` | Inspected | Vite build & proxy config |
| `moneytrace.db` | Inspected | Committed SQLite DB at root (3.2MB) |

### Category B: Backend Configuration, Alembic & Database Files
| File Path | Status | Notes |
|---|---|---|
| `backend/.env.example` | Inspected | Environment variable template |
| `backend/README.md` | Inspected | Backend documentation |
| `backend/alembic.ini` | Inspected | Alembic configuration |
| `backend/app.db` | Inspected | Committed SQLite DB |
| `backend/clean_database.py` | Inspected | DB cleanup script |
| `backend/e2e_server.log` | Inspected | Committed server log (98KB) |
| `backend/graph_test_output.txt` | Inspected | Committed test output (47KB) |
| `backend/moneytrace.db` | Inspected | Committed primary SQLite DB (3.69MB) |
| `backend/moneytrace_backup.db` | Inspected | Committed backup SQLite DB (3.59MB) |
| `backend/moneytrace_test.db` | Inspected | Committed test SQLite DB (368KB) |
| `backend/pytest.ini` | Inspected | Pytest configuration |
| `backend/requirements.txt` | Inspected | Python dependency list |
| `backend/alembic/env.py` | Inspected | Alembic environment script |
| `backend/alembic/script.py.mako` | Inspected | Alembic template |
| `backend/alembic/versions/readme.md` | Inspected | Alembic versions readme |
| `backend/alembic/versions/2024_create_users_table.py` | Inspected | Migration: users table |
| `backend/alembic/versions/2024_create_accounts_transactions.py` | Inspected | Migration: accounts & transactions |
| `backend/alembic/versions/2024_add_auth_fields_to_users.py` | Inspected | Migration: auth fields |
| `backend/alembic/versions/62bc1a4ced62_add_scenario_run_model.py` | Inspected | Migration: scenario runs |
| `backend/alembic/versions/9fb551ddd598_add_scenario_provenance_to_transactions.py` | Inspected | Migration: scenario provenance |
| `backend/alembic/versions/c611d5081891_sync_missing_fields_safe.py` | Inspected | Migration: sync fields |

### Category C: Backend Scratch & Development Utility Scripts
| File Path | Status | Notes |
|---|---|---|
| `backend/scratch_clean.py` | Inspected | Scratch script |
| `backend/scratch_gen_alembic.py` | Inspected | Scratch script |
| `backend/scratch_prep_gen.py` | Inspected | Scratch script |
| `backend/scratch_reset_alembic.py` | Inspected | Scratch script |
| `backend/scratch_rewrite.py` | Inspected | Scratch script |
| `backend/scratch_rewrite_safe.py` | Inspected | Scratch script |
| `backend/scratch_strip_alter.py` | Inspected | Scratch script |
| `backend/scratch_test_alembic.py` | Inspected | Scratch script |
| `backend/scratch_test_bool.py` | Inspected | Scratch script |
| `backend/scratch_test_e2e.py` | Inspected | Scratch script |
| `backend/scripts/run_all_smoke_tests.py` | Inspected | Smoke test runner |
| `backend/scripts/seed_ai_chat.py` | Inspected | Seeder |
| `backend/scripts/seed_dashboard_data.py` | Inspected | Seeder |
| `backend/scripts/seed_demo_accounts.py` | Inspected | Seeder |
| `backend/scripts/seed_graph_data.py` | Inspected | Seeder |
| `backend/scripts/seed_investigation_data.py` | Inspected | Seeder |
| `backend/scripts/seed_recovery_cases.py` | Inspected | Seeder |
| `backend/scripts/seed_reports_data.py` | Inspected | Seeder |
| `backend/scripts/seed_suspicious_data.py` | Inspected | Seeder |
| `backend/scripts/seed_users.py` | Inspected | Seeder |
| `backend/scripts/simulate_live_traffic.py` | Inspected | Live traffic simulator |
| `backend/scripts/test_assistant_endpoints.py` | Inspected | Test script |
| `backend/scripts/test_dashboard_endpoints.py` | Inspected | Test script |
| `backend/scripts/test_endpoints.py` | Inspected | Test script |
| `backend/scripts/test_graph_endpoints.py` | Inspected | Test script |
| `backend/scripts/test_ip_map.py` | Inspected | Test script |
| `backend/scripts/test_recovery_endpoints.py` | Inspected | Test script |
| `backend/scripts/test_reports_endpoints.py` | Inspected | Test script |

### Category D: Backend Core & Architecture
| File Path | Status | Notes |
|---|---|---|
| `backend/app/__init__.py` | Inspected | Init |
| `backend/app/config.py` | Inspected | Settings & env parsing |
| `backend/app/database.py` | Inspected | SQLAlchemy engine & session |
| `backend/app/main.py` | Inspected | FastAPI entrypoint & middleware |
| `backend/app/core/__init__.py` | Inspected | Init |
| `backend/app/core/deps.py` | Inspected | FastAPI dependencies & auth guards |
| `backend/app/core/exceptions.py` | Inspected | Exception handlers |
| `backend/app/core/responses.py` | Inspected | API response formats |
| `backend/app/core/security.py` | Inspected | JWT & password hashing |
| `backend/app/core/websocket.py` | Inspected | WebSocket connection manager |
| `backend/app/core/websocket_events.py` | Inspected | WebSocket event structures |
| `backend/app/utils/__init__.py` | Inspected | Init |

### Category E: Backend Database Models
| File Path | Status | Notes |
|---|---|---|
| `backend/app/models/__init__.py` | Inspected | Model exports |
| `backend/app/models/account.py` | Inspected | Account model |
| `backend/app/models/audit_log.py` | Inspected | Audit log model |
| `backend/app/models/fraud_alert.py` | Inspected | Fraud alert model |
| `backend/app/models/investigation.py` | Inspected | Investigation case model |
| `backend/app/models/investigator_chat.py` | Inspected | Chat history model |
| `backend/app/models/recovery.py` | Inspected | Recovery case & legal notice models |
| `backend/app/models/scenario.py` | Inspected | Scenario simulation models |
| `backend/app/models/transaction.py` | Inspected | Transaction model |
| `backend/app/models/user.py` | Inspected | User & role models |
| `backend/app/models/watchlist.py` | Inspected | Watchlist model |

### Category F: Backend Schemas
| File Path | Status | Notes |
|---|---|---|
| `backend/app/schemas/__init__.py` | Inspected | Schema exports |
| `backend/app/schemas/ai_assistant.py` | Inspected | Copilot schemas |
| `backend/app/schemas/auth.py` | Inspected | Login/Register schemas |
| `backend/app/schemas/dashboard.py` | Inspected | Dashboard DTOs |
| `backend/app/schemas/fraud.py` | Inspected | Alert & rule schemas |
| `backend/app/schemas/graph.py` | Inspected | Node & edge schemas |
| `backend/app/schemas/health.py` | Inspected | Health check schema |
| `backend/app/schemas/recovery.py` | Inspected | Recovery DTOs |
| `backend/app/schemas/reports.py` | Inspected | Report request/response schemas |
| `backend/app/schemas/scenario.py` | Inspected | Scenario trigger & run schemas |
| `backend/app/schemas/transaction.py` | Inspected | Transaction schemas |
| `backend/app/schemas/user.py` | Inspected | User schemas |

### Category G: Backend Services & Engines
| File Path | Status | Notes |
|---|---|---|
| `backend/app/services/__init__.py` | Inspected | Service exports |
| `backend/app/services/ai_assistant.py` | Inspected | AI Copilot logic |
| `backend/app/services/auth.py` | Inspected | Auth business logic |
| `backend/app/services/case_similarity.py` | Inspected | Vector / heuristic similarity |
| `backend/app/services/dashboard_service.py` | Inspected | Aggregate metrics |
| `backend/app/services/fraud_classifier.py` | Inspected | ML / scoring classifier |
| `backend/app/services/fraud_rules.py` | Inspected | Rule evaluation engine |
| `backend/app/services/fraud_service.py` | Inspected | Core fraud pipeline |
| `backend/app/services/geoip.py` | Inspected | IP geolocation resolution |
| `backend/app/services/graph_engine.py` | Inspected | NetworkX graph analysis |
| `backend/app/services/rag_knowledge.py` | Inspected | Knowledge base retrieval |
| `backend/app/services/recovery_engine.py` | Inspected | Recovery scoring & steps |
| `backend/app/services/recovery_service.py` | Inspected | Recovery case management |
| `backend/app/services/report_generator.py` | Inspected | PDF/DOCX/CSV/XLSX generator |
| `backend/app/services/scenario_service.py` | Inspected | Simulation lifecycle |
| `backend/app/services/transaction.py` | Inspected | Transaction processing |

### Category H: Backend API Endpoints
| File Path | Status | Notes |
|---|---|---|
| `backend/app/routes/__init__.py` | Inspected | Route init |
| `backend/app/routes/root.py` | Inspected | Root health & info |
| `backend/app/routes/api_v1/__init__.py` | Inspected | API v1 router |
| `backend/app/routes/api_v1/endpoints/__init__.py` | Inspected | Endpoint init |
| `backend/app/routes/api_v1/endpoints/alerts.py` | Inspected | Alert management |
| `backend/app/routes/api_v1/endpoints/assistant.py` | Inspected | Copilot chat & suggestions |
| `backend/app/routes/api_v1/endpoints/audit_logs.py` | Inspected | Audit log retrieval |
| `backend/app/routes/api_v1/endpoints/auth.py` | Inspected | Authentication & registration |
| `backend/app/routes/api_v1/endpoints/dashboard.py` | Inspected | Dashboard statistics |
| `backend/app/routes/api_v1/endpoints/fraud.py` | Inspected | Fraud checks & rules |
| `backend/app/routes/api_v1/endpoints/graph.py` | Inspected | Graph topology endpoints |
| `backend/app/routes/api_v1/endpoints/investigation.py` | Inspected | Cases & evidence |
| `backend/app/routes/api_v1/endpoints/recovery.py` | Inspected | Asset recovery workflows |
| `backend/app/routes/api_v1/endpoints/reports.py` | Inspected | Export generation |
| `backend/app/routes/api_v1/endpoints/scenarios.py` | Inspected | Scenario control |
| `backend/app/routes/api_v1/endpoints/simulation.py` | Inspected | Traffic simulator |
| `backend/app/routes/api_v1/endpoints/transactions.py` | Inspected | Transaction CRUD & stream |
| `backend/app/routes/api_v1/endpoints/users.py` | Inspected | User management |
| `backend/app/routes/api_v1/endpoints/watchlist.py` | Inspected | Watchlist endpoints |

### Category I: Backend Tests
| File Path | Status | Notes |
|---|---|---|
| `backend/tests/test_ai_assistant.py` | Inspected | Copilot tests |
| `backend/tests/test_dashboard.py` | Inspected | Dashboard endpoint tests |
| `backend/tests/test_fraud_engine.py` | Inspected | Fraud rule tests |
| `backend/tests/test_graph_engine.py` | Inspected | Graph analytics tests |
| `backend/tests/test_reports.py` | Inspected | Report generation tests |
| `backend/tests/test_scenario_endpoints.py` | Inspected | Scenario API tests |
| `backend/tests/test_scenario_pipeline.py` | Inspected | Scenario execution tests |

### Category J: Frontend Core, Services & State
| File Path | Status | Notes |
|---|---|---|
| `src/main.tsx` | Inspected | React entrypoint |
| `src/App.tsx` | Inspected | Main router & routes |
| `src/index.css` | Inspected | Global CSS |
| `src/api/axios.ts` | Inspected | Axios instance & interceptors |
| `src/api/env.ts` | Inspected | Environment config |
| `src/api/errors.ts` | Inspected | Error handling |
| `src/api/index.ts` | Inspected | API index |
| `src/contexts/AuthContext.tsx` | Inspected | Auth state & token storage |
| `src/contexts/QueryProvider.tsx` | Inspected | TanStack Query config |
| `src/types/index.ts` | Inspected | TypeScript definitions |
| `src/utils/formatters.ts` | Inspected | Currency/date formatters |
| `src/utils/graphLayouts.ts` | Inspected | Graph canvas layouts |
| `src/utils/soundAlarm.ts` | Inspected | Audio alert synthesizers |
| `src/services/alertService.ts` | Inspected | Alert API client |
| `src/services/authService.ts` | Inspected | Auth API client |
| `src/services/chatService.ts` | Inspected | Chat API client |
| `src/services/dashboardService.ts` | Inspected | Dashboard API client |
| `src/services/graphService.ts` | Inspected | Graph API client |
| `src/services/index.ts` | Inspected | Services index |
| `src/services/investigationService.ts` | Inspected | Investigation API client |
| `src/services/recoveryService.ts` | Inspected | Recovery API client |
| `src/services/reportService.ts` | Inspected | Report API client |
| `src/services/transactionService.ts` | Inspected | Transaction API client |
| `src/services/userService.ts` | Inspected | User API client |
| `src/hooks/index.ts` | Inspected | Hooks index |
| `src/hooks/useAlerts.ts` | Inspected | Alert hooks |
| `src/hooks/useAuth.ts` | Inspected | Auth hooks |
| `src/hooks/useChat.ts` | Inspected | Chat hooks |
| `src/hooks/useDashboard.ts` | Inspected | Dashboard hooks |
| `src/hooks/useFlow.ts` | Inspected | Flow hooks |
| `src/hooks/useGraph.ts` | Inspected | Graph hooks |
| `src/hooks/useInvestigation.ts` | Inspected | Case hooks |
| `src/hooks/useInvestigations.ts` | Inspected | Cases list hooks |
| `src/hooks/useRecovery.ts` | Inspected | Recovery hooks |
| `src/hooks/useReports.ts` | Inspected | Reports hooks |
| `src/hooks/useTransactions.ts` | Inspected | Transaction hooks |
| `src/hooks/useWebSocket.ts` | Inspected | Live WebSocket client |

### Category K: Frontend Pages
| File Path | Status | Notes |
|---|---|---|
| `src/pages/Alerts.tsx` | Inspected | Alerts SOC page |
| `src/pages/AuditLogs.tsx` | Inspected | Audit trail page |
| `src/pages/AuthPortal.tsx` | Inspected | Login & registration |
| `src/pages/Chat.tsx` | Inspected | AI Copilot Chat |
| `src/pages/Dashboard.tsx` | Inspected | Main investigator SOC dashboard |
| `src/pages/ExecutiveDashboard.tsx` | Inspected | Executive summary dashboard |
| `src/pages/Flow.tsx` | Inspected | Money flow graph analysis |
| `src/pages/Investigation.tsx` | Inspected | Investigation workspace |
| `src/pages/Recovery.tsx` | Inspected | Recovery & asset freeze page |
| `src/pages/Reports.tsx` | Inspected | Report generator page |
| `src/pages/ScenarioController.tsx` | Inspected | Scenario simulator controller |
| `src/pages/Settings.tsx` | Inspected | Application settings |
| `src/pages/Transactions.tsx` | Inspected | Transaction ledger |
| `src/pages/Unauthorized.tsx` | Inspected | 403 page |
| `src/pages/Watchlist.tsx` | Inspected | Watchlist page |
| `src/pages/customer/CustomerHome.tsx` | Inspected | Customer banking portal |
| `src/pages/customer/CustomerLogin.tsx` | Inspected | Customer login redirect |
| `src/pages/customer/CustomerProfile.tsx` | Inspected | Customer profile |
| `src/pages/customer/CustomerSendMoney.tsx` | Inspected | Customer transfer form |
| `src/pages/customer/CustomerTransactions.tsx` | Inspected | Customer statement |

### Category L: Frontend Components
| File Path | Status | Notes |
|---|---|---|
| `src/components/alerts/AlertCard.tsx` | Inspected | Alert list item |
| `src/components/alerts/EmergencyInvestigationOverlay.tsx` | Inspected | Critical alert takeover |
| `src/components/alerts/XAIBreakdownModal.tsx` | Inspected | Explainable AI alert modal |
| `src/components/auth/LoginForm.tsx` | Inspected | Login component |
| `src/components/auth/RegisterForm.tsx` | Inspected | Registration component |
| `src/components/common/LoadingSpinner.tsx` | Inspected | UI loader |
| `src/components/common/Pagination.tsx` | Inspected | Pagination control |
| `src/components/common/ProtectedRoute.tsx` | Inspected | Route guard |
| `src/components/common/RichMessageRenderer.tsx` | Inspected | Chat markdown renderer |
| `src/components/common/ToastCenter.tsx` | Inspected | Notifications |
| `src/components/customer/BalanceCard.tsx` | Inspected | Account balance card |
| `src/components/customer/CustomerLayout.tsx` | Inspected | Customer layout |
| `src/components/customer/FrequentRecipients.tsx` | Inspected | Quick transfer contacts |
| `src/components/customer/QuickActions.tsx` | Inspected | Customer actions |
| `src/components/customer/ReceiveMoneyModal.tsx` | Inspected | QR/Account receive modal |
| `src/components/customer/TransactionReceiptModal.tsx` | Inspected | Transfer receipt |
| `src/components/dashboard/ActiveUsersWidget.tsx` | Inspected | Active users |
| `src/components/dashboard/DashboardSkeleton.tsx` | Inspected | Loading skeleton |
| `src/components/dashboard/DemoControlPanel.tsx` | Inspected | Demo actions |
| `src/components/dashboard/FraudGeoHeatmap.tsx` | Inspected | Leaflet/Canvas heatmap |
| `src/components/dashboard/FraudHeatmapSlider.tsx` | Inspected | Heatmap time slider |
| `src/components/dashboard/InvestigatorLeaderboard.tsx` | Inspected | Gamification widget |
| `src/components/dashboard/LiveRecoveryTracker.tsx` | Inspected | Recovery tracker |
| `src/components/dashboard/LiveTicker.tsx` | Inspected | Live alert marquee |
| `src/components/dashboard/RecoveryCommandCenter.tsx` | Inspected | Command center |
| `src/components/dashboard/StatCard.tsx` | Inspected | KPI stat card |
| `src/components/dashboard/ThreatIntelFeed.tsx` | Inspected | Threat intelligence |
| `src/components/dashboard/ThreatRadarWidget.tsx` | Inspected | Radar threat chart |
| `src/components/graph/AICopilotDrawer.tsx` | Inspected | Graph Copilot drawer |
| `src/components/graph/CaseReplayBar.tsx` | Inspected | Graph time-travel replay |
| `src/components/graph/FraudAlertCenter.tsx` | Inspected | Graph embedded alert center |
| `src/components/graph/FraudRingPanel.tsx` | Inspected | Graph ring detector |
| `src/components/graph/GraphCanvas.tsx` | Inspected | 2D canvas graph visualizer |
| `src/components/graph/GraphControls.tsx` | Inspected | Graph zoom & filter controls |
| `src/components/graph/LiveTransactionFeed.tsx` | Inspected | Live feed |
| `src/components/graph/NodeInspector.tsx` | Inspected | Entity detail inspector |
| `src/components/graph/OnlineUsersPanel.tsx` | Inspected | Online investigators |
| `src/components/graph/TracePlayback.tsx` | Inspected | Trace flow animator |
| `src/components/investigation/AICaseSummaryModal.tsx` | Inspected | Case summary generator |
| `src/components/investigation/EvidenceLocker.tsx` | Inspected | Evidence file locker |
| `src/components/investigation/InvestigationPlaybook.tsx` | Inspected | Playbook checklist |
| `src/components/investigation/InvestigatorNotes.tsx` | Inspected | Case notes editor |
| `src/components/investigation/SimilarCasesCard.tsx` | Inspected | Similar cases vector search |
| `src/components/investigation/WhatIfSimulatorModal.tsx` | Inspected | Counterfactual simulator |
| `src/components/layout/AppLayout.tsx` | Inspected | Main investigator layout |
| `src/components/layout/EmergencyAlertDrawer.tsx` | Inspected | Drawer for critical events |
| `src/components/layout/Sidebar.tsx` | Inspected | Navigation sidebar |
| `src/components/layout/TopNav.tsx` | Inspected | Top header & user profile |
| `src/components/login/IntelligenceGlobe.tsx` | Inspected | Three.js globe on login |
| `src/components/recovery/LegalNoticeModal.tsx` | Inspected | Section 91 notice modal |
| `src/components/recovery/RecoveryCalculatorModal.tsx` | Inspected | Recovery probability calc |
| `src/components/reports/SARGeneratorModal.tsx` | Inspected | SAR filing modal |
| `src/components/transactions/IPGeospatialMap.tsx` | Inspected | Transaction IP map |
| `src/components/transactions/TransactionTable.tsx` | Inspected | Transaction data grid |

### Category M: Documentation, External Specs & Tests
| File Path | Status | Notes |
|---|---|---|
| `docs/ACCESSIBILITY_REPORT.md` | Inspected | Docs review |
| `docs/AI_ENGINE_DOCUMENTATION.md` | Inspected | Docs review |
| `docs/API_REFERENCE.md` | Inspected | Docs review |
| `docs/BACKEND_CONNECTION_AUDIT.md` | Inspected | Docs review |
| `docs/CLEANUP_REPORT.md` | Inspected | Docs review |
| `docs/DATABASE_SCHEMA.md` | Inspected | Docs review |
| `docs/DATA_FLOW.md` | Inspected | Docs review |
| `docs/DEMO_GUIDE.md` | Inspected | Docs review |
| `docs/FRONTEND_AUDIT.md` | Inspected | Docs review |
| `docs/INSTALLATION_GUIDE.md` | Inspected | Docs review |
| `docs/LIVE_DEMO_WALKTHROUGH.md` | Inspected | Docs review |
| `docs/PROJECT_STRUCTURE.md` | Inspected | Docs review |
| `docs/SYSTEM_ARCHITECTURE.md` | Inspected | Docs review |
| `docs/UI_AUDIT_REPORT.md` | Inspected | Docs review |
| `tests/auth_screenshot.spec.ts` | Inspected | Playwright spec |
| `tests/screenshot.spec.ts` | Inspected | Playwright spec |
| `test-results/.last-run.json` | Inspected | Test run cache |

### Category N: Binary Assets, Media & Storage Artifacts (Excluded from line-by-line code review, verified for provenance & security)
| File Path | Status | Reason / Provenance |
|---|---|---|
| `docs/screenshots/*.png` (9 files) | Excluded line-by-line | Static PNG image documentation assets |
| `screenshots/*.png` (16 files) | Excluded line-by-line | E2E screenshot artifacts |
| `public/textures/*.jpg, *.png` (3 files) | Excluded line-by-line | Three.js Earth globe textures |
| `backend/storage/reports/charts/*.png` (2 files) | Excluded line-by-line | Generated chart assets |
| `backend/storage/reports/csv/*.csv` (17 files) | Excluded line-by-line | Generated CSV sample reports (inspected for formula injection) |
| `backend/storage/reports/docx/*.docx` (7 files) | Excluded line-by-line | Generated Word document reports |
| `backend/storage/reports/pdf/*.pdf` (7 files) | Excluded line-by-line | Generated PDF reports |
| `backend/storage/reports/xlsx/*.xlsx` (5 files) | Excluded line-by-line | Generated Excel spreadsheets |
