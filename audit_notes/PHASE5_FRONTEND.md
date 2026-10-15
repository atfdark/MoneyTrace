# MoneyTrace Audit Notes — Phase 5: Frontend Architecture, Components & State

**Inspection Date:** 2026-10-14  
**Scope:** Complete frontend source code (`src/` directory, 46 files across `api/`, `components/`, `contexts/`, `hooks/`, `pages/`, `types/`, `utils/`).  
**Auditor Mode:** Read-Only Application Security, React/TypeScript & UX Integrity Assessor  

---

## 1. Executive Summary of Phase 5

Phase 5 inspected the complete client-side architecture of MoneyTrace. While the UI displays a polished, high-tech dark/light SOC design with animated telemetry, canvas graphs, and real-time alerts, critical architectural flaws, dead code, cosmetic security illusions, and misleading claims were uncovered:
1. **Massive Orphaned Codebase:** Eight (8) entire React pages (over 100KB of source code), including `Investigation.tsx` (the core forensic investigation case workspace), `Watchlist.tsx`, `ExecutiveDashboard.tsx`, and the entire retail customer portal (`CustomerHome.tsx`, `CustomerSendMoney.tsx`, `CustomerTransactions.tsx`, `CustomerProfile.tsx`, `CustomerLogin.tsx`), are completely unmounted in `src/App.tsx` and absent from navigation.
2. **Unauthenticated WebSocket Telemetry Injection:** `src/hooks/useWebSocket.ts` connects to `/api/v1/ws/live` passing `user_id`, `username`, and `role` as cleartext, unverified query parameters without any JWT token or authentication header.
3. **Cosmetic Security Illusion in UPI PIN:** `CustomerSendMoney.tsx` presents a 4-digit PIN verification modal but completely strips the PIN before sending the HTTP POST payload to `/transactions/send`.
4. **Token Storage Risks:** Long-lived refresh tokens and access tokens are stored in `localStorage` (`src/api/axios.ts`).
5. **Fabricated Intelligence & Legal Claims:** `ThreatIntelFeed.tsx` displays hardcoded mock news labeled "INTERPOL & I4C SYNCED", while `ScenarioController.tsx` claims "Sec 91 CrPC freezes and capital restitution" executed on real accounts.

---

## 2. Detailed Findings (Findings 41 – 48)

### FINDING-41: Eight Orphaned and Unmounted React Pages (>100KB Dead Code)
- **Severity:** High
- **Location:** `src/App.tsx:61-114`, `src/components/layout/Sidebar.tsx:6-36`
- **Observed Behavior:**
  The following page components exist with full implementations but are never imported or routed in `src/App.tsx`:
  - `src/pages/Investigation.tsx` (32.1 KB — case management, evidence board, timelines)
  - `src/pages/Watchlist.tsx` (14.1 KB — high-risk account registry, AML typologies)
  - `src/pages/ExecutiveDashboard.tsx` (9.8 KB — high-level fraud KPIs)
  - `src/pages/customer/CustomerHome.tsx` (12.1 KB — retail banking home, balance, quick transfers)
  - `src/pages/customer/CustomerSendMoney.tsx` (24.7 KB — payment workflow, beneficiary risk warnings)
  - `src/pages/customer/CustomerTransactions.tsx` (8.2 KB — passbook, statement exports)
  - `src/pages/customer/CustomerProfile.tsx` (7.0 KB — customer account details, UPI ID)
  - `src/pages/customer/CustomerLogin.tsx` (0.2 KB — redirect stub)
- **Impact:**
  Key core platform capabilities claimed in project documentation (such as forensic case investigations, watchlist management, and retail customer banking interactions) are completely unreachable to users. Furthermore, if a user registers as role `customer`, they are permanently redirected to `/unauthorized` because no customer routes exist.
- **Recommended Fix:**
  Mount lazy-loaded routes in `src/App.tsx` for `/investigation`, `/watchlist`, `/executive`, and a dedicated `/customer/*` layout guarded by `allowedRoles={['customer']}`. Add corresponding navigation links in `Sidebar.tsx`.
- **Status:** Confirmed.

---

### FINDING-42: Unauthenticated WebSocket Identity & Role Injection via Query Parameters
- **Severity:** High
- **Location:** `src/hooks/useWebSocket.ts:100-108`
- **Observed Behavior:**
  ```typescript
  const params = new URLSearchParams();
  if (userMetadata?.user_id) params.set('user_id', userMetadata.user_id);
  if (userMetadata?.username) params.set('username', userMetadata.username);
  if (userMetadata?.account_number) params.set('account_number', userMetadata.account_number);
  if (userMetadata?.role) params.set('role', userMetadata.role);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const wsUrl = `${protocol}//${host}/api/v1/ws/live${qs}`;
  this.ws = new WebSocket(wsUrl);
  ```
- **Impact:**
  No authorization token is provided. Any unauthenticated client or eavesdropper can connect to `ws://host/api/v1/ws/live?user_id=attacker&role=admin` and receive real-time streams of all financial transactions, account balances, user PII, and fraud alerts across the platform.
- **Recommended Fix:**
  Require a short-lived ticket or JWT token in the WebSocket connection handshake (`?token=${accessToken}` or `Sec-WebSocket-Protocol`), and validate it server-side before accepting the connection.
- **Status:** Confirmed.

---

### FINDING-43: Insecure Storage of Access and Refresh Tokens in `localStorage`
- **Severity:** Medium
- **Location:** `src/api/axios.ts:9-29`
- **Observed Behavior:**
  ```typescript
  export const setTokens = (accessToken: string, refreshToken: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  };
  ```
- **Impact:**
  Any Cross-Site Scripting (XSS) vulnerability or malicious third-party script injected via CDNs/npm dependencies can read `localStorage` and exfiltrate long-lived refresh tokens, enabling permanent account takeover.
- **Recommended Fix:**
  Store refresh tokens in `HttpOnly`, `Secure`, `SameSite=Strict` cookies issued by the backend `/auth/login` endpoint. Keep access tokens in memory (React Context / closure) rather than persistent storage.
- **Status:** Confirmed.

---

### FINDING-44: Client-Side Cosmetic Illusion for UPI PIN Authentication
- **Severity:** Medium
- **Location:** `src/pages/customer/CustomerSendMoney.tsx:139-145`, `73-77`
- **Observed Behavior:**
  The UI displays an authentic-looking 4-digit numeric PIN keypad modal:
  ```typescript
  const handleConfirmPin = () => {
    if (pin.length < 4) {
      setErrorMessage('Please enter your 4-digit UPI PIN.');
      return;
    }
    transferMutation.mutate();
  };
  ```
  However, in `transferMutation.mutationFn`:
  ```typescript
  const res = await api.post('/transactions/send', {
    receiver_account_number: selectedRecipient.account_number,
    amount: numAmount,
    remark: remark.trim() || 'Instant Transfer',
  });
  ```
  The PIN is never included in the request payload or verified by the backend.
- **Impact:**
  Creates a false impression of multi-factor transaction authorization. Any script or caller can bypass the PIN entry completely by calling `/transactions/send` directly.
- **Recommended Fix:**
  Include `upi_pin` in `SendMoneyRequest` schema and hash/verify it server-side against `User.upi_pin_hash` before executing debits.
- **Status:** Confirmed.

---

### FINDING-45: Misleading UI Statements Claiming Real Statutory Bank Actions
- **Severity:** Medium
- **Location:** `src/pages/ScenarioController.tsx:102, 118`
- **Observed Behavior:**
  The scenario simulator displays messages claiming:
  `Executing Sec 91 CrPC freezes and capital restitution...`  
  `🎉 WE HAVE RECOVERED: 100% of capital (₹1,50,000) restituted to victim! All 3 mule accounts frozen under Section 91 CrPC.`
- **Impact:**
  Violates product constraints: "Do not describe simulated transactions as real financial activity. Do not claim actual bank integration, bank-side freezing, fund recovery, or external financial actions unless the implementation and authorization genuinely support them."
- **Recommended Fix:**
  Update UI copy to explicitly state simulation status: `[SIMULATION] Simulated freeze order logged and simulated balance transferred for demonstration purposes.`
- **Status:** Confirmed.

---

### FINDING-46: Hardcoded Mock Threat Intelligence Feeds in SOC Dashboard
- **Severity:** Medium
- **Location:** `src/components/dashboard/ThreatIntelFeed.tsx:12-45, 67`
- **Observed Behavior:**
  The dashboard renders a static array of mock news items:
  - `CERT-In / I4C Feed: Active trojan SafeBank_v4.apk...`
  - `National Cyber Crime Cell: High-velocity pass-through transfers...`
  - `RBI Fraud Intelligence Gateway: Physical static QR stickers compromised...`
  - Badge: `INTERPOL & I4C SYNCED`
  Timestamps are static strings (`"10 mins ago"`, `"25 mins ago"`).
- **Impact:**
  Presents fabricated external threat intelligence feeds as live telemetry without disclosing that they are static demonstration placeholders.
- **Recommended Fix:**
  Add a clear `[DEMO / MOCK FEED]` badge to the widget header or connect to an actual threat feed API.
- **Status:** Confirmed.

---

### FINDING-47: Hardcoded Default Identifiers in Forensic Reports Page
- **Severity:** Low
- **Location:** `src/pages/Reports.tsx:16-17`
- **Observed Behavior:**
  ```typescript
  const [selectedCaseId, setSelectedCaseId] = useState('CASE-2026-0801');
  const [selectedAlertId, setSelectedAlertId] = useState('ALT20260816051149913');
  ```
- **Impact:**
  If the database does not contain `CASE-2026-0801` or `ALT20260816051149913`, report generation attempts immediately fail with 404 errors until the user manually types valid IDs.
- **Recommended Fix:**
  Populate dropdown selectors dynamically from `/investigation/cases` and `/alerts`.
- **Status:** Confirmed.

---

### FINDING-48: Hard Page Reloads Disrupting SPA State on 401 Interceptions
- **Severity:** Low
- **Location:** `src/api/axios.ts:112, 135`
- **Observed Behavior:**
  ```typescript
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
  ```
- **Impact:**
  Direct assignment to `window.location.href` bypasses React Router's SPA lifecycle, causing full browser reloads and losing all unsaved component state or breadcrumbs.
- **Recommended Fix:**
  Dispatch an authentication event or use an auth store callback to navigate cleanly via React Router.
- **Status:** Confirmed.
