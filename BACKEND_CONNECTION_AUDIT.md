# MoneyTrace Backend Connection & Integration Audit

This audit evaluates the connectivity between the React frontend and the FastAPI backend endpoints, verifying real-time database querying, absence of mock data, and robust error handling.

---

## 1. Page-by-Page Connection Audit Matrix

| Page Module | Primary Backend Endpoints | Data Source | Real API? | Error Handling Present? |
| :--- | :--- | :---: | :---: | :---: |
| **Login / Register** | `POST /api/v1/auth/login`<br/>`POST /api/v1/auth/register` | SQLite `users` table | **Yes** | Banner alerts, field-level validation, 401/409 handling. |
| **Dashboard (`/dashboard`)** | `GET /api/v1/dashboard/overview`<br/>`GET /api/v1/dashboard/live`<br/>`GET /api/v1/dashboard/trends` | Real SQLite database queries & aggregations | **Yes** | Skeleton fallbacks, React Query retry logic. |
| **Transactions (`/transactions`)** | `GET /api/v1/transactions`<br/>`POST /api/v1/transactions` | SQLite `transactions` table | **Yes** | Table skeletons, inline alert dialogs. |
| **Alerts (`/alerts`)** | `GET /api/v1/fraud/alerts`<br/>`PATCH /api/v1/fraud/alerts/{id}/status` | SQLite `fraud_alerts` table | **Yes** | Status update confirmation, live refetch. |
| **Money Flow (`/flow`)** | `GET /api/v1/graph/trace/{id}`<br/>`GET /api/v1/graph/network`<br/>`GET /api/v1/graph/suspicious` | NetworkX in-memory graph over SQLite ledger | **Yes** | Empty node fallback, trace error boundary. |
| **Recovery (`/recovery`)** | `GET /api/v1/recovery/cases`<br/>`GET /api/v1/recovery/cases/{id}` | SQLite `recovery_cases` table | **Yes** | Empty case handler, recalculation feedback. |
| **AI Copilot (`/chat`)** | `POST /api/v1/assistant/chat`<br/>`GET /api/v1/assistant/rag-search` | Local NLU engine + RAG knowledge + SQLite logs | **Yes** | Inline server error bubble, retry button. |
| **Reports (`/reports`)** | `GET /api/v1/reports/*` (14 endpoints) | Live generated PDF, DOCX, CSV, XLSX files | **Yes** | Building state indicators, blob error alert. |

---

## 2. API Proxy & Security Verification

- **Vite Proxy (`vite.config.ts`)**:
  - Automatically forwards `/api/*` requests to `http://127.0.0.1:8000`.
- **Axios Interceptor (`src/api/axios.ts`)**:
  - Automatically attaches `Authorization: Bearer <access_token>` on all outbound requests.
  - Automatically intercepts `401 Unauthorized` responses and triggers `/auth/refresh` without user interruption.
- **FastAPI CORS**:
  - Whitelists `http://localhost:5173` with credentials support.
