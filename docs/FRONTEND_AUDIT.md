# MoneyTrace Frontend Codebase & Component Audit

This document catalogs all active frontend views, components, hooks, services, and identifies any deprecated or unused artifacts.

---

## 1. Active Pages & Routes Inventory

| Page File | Route | Associated Backend Service | Status |
| :--- | :--- | :--- | :---: |
| `src/pages/Dashboard.tsx` | `/dashboard` | `dashboardService.getStats()` | **Active** |
| `src/pages/Transactions.tsx` | `/transactions` | `transactionService.getHistory()` | **Active** |
| `src/pages/Alerts.tsx` | `/alerts` | `alertService.getAlerts()` | **Active** |
| `src/pages/Flow.tsx` | `/flow` | `graphService.getGraph()`, `graphService.trace()` | **Active** |
| `src/pages/Recovery.tsx` | `/recovery` | `recoveryService.getCases()` | **Active** |
| `src/pages/Investigation.tsx` | `/investigation` | `recoveryService.getCases()` | **Active** |
| `src/pages/Chat.tsx` | `/chat` | `chatService.sendMessage()`, `/assistant/chat` | **Active** |
| `src/pages/Reports.tsx` | `/reports` | `reportService.*`, `/reports/*` | **Active** |
| `src/pages/Settings.tsx` | `/settings` | Static platform diagnostic | **Active** |
| `src/pages/Unauthorized.tsx` | `/unauthorized` | RBAC Error boundary | **Active** |

---

## 2. Component Usage & Dependency Map

| Component Group | Components | Referenced By | Status |
| :--- | :--- | :--- | :---: |
| **Auth** | `LoginForm.tsx`, `RegisterForm.tsx` | `App.tsx` | **Active** |
| **Common** | `ProtectedRoute.tsx`, `LoadingSpinner.tsx`, `Pagination.tsx` | `App.tsx`, `Alerts.tsx`, `Transactions.tsx` | **Active** |
| **Layout** | `AppLayout.tsx`, `Sidebar.tsx`, `TopNav.tsx` | `App.tsx` | **Active** |
| **Transactions** | `TransactionTable.tsx` | `Transactions.tsx` | **Active** |
| **Alerts** | `AlertCard.tsx` | `Alerts.tsx` | **Active** |
| **Dashboard** | `StatCard.tsx` | `Dashboard.tsx` | **Active** |

---

## 3. Dead Code & Unused Files Summary

| Item Category | Findings | Action Recommendation |
| :--- | :--- | :--- |
| **Unused Pages** | None. All 10 page modules are actively routed in `src/App.tsx`. | No deletion required. |
| **Duplicate Components** | None. No redundant `DashboardNew.tsx` or `ChatOld.tsx` detected. | Codebase is clean. |
| **Unused Hooks** | All 10 hook modules (`useAuth`, `useAlerts`, `useTransactions`, `useFlow`, `useInvestigations`, `useRecovery`, `useDashboard`, `useChat`, `useReports`, `useGraph`) are actively utilized. | Retain all hooks. |
| **Unused CSS** | No conflicting CSS frameworks. Clean Tailwind CSS base. | Retain. |
