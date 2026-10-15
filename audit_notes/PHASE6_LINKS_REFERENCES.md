# MoneyTrace Audit Notes — Phase 6: Comprehensive Link & External Reference Audit

**Inspection Date:** 2026-10-14  
**Scope:** Complete repository scan for URLs, CDNs, external scripts, asset references, and internal routes.  
**Auditor Mode:** Read-Only Link, Reference & Infrastructure Integrity Auditor  

---

## 1. Executive Summary of Phase 6

Phase 6 discovered and analyzed all external URLs, CDNs, asset links, internal endpoints, and documentation references across Python, TypeScript, HTML, CSS, Markdown, and configuration files.

### Key Observations:
1. **Broken Asset Reference:** `index.html:5` references `/favicon.svg`, but `public/favicon.svg` does not exist in the filesystem, causing 404 errors on every browser tab load.
2. **Broken Documented API Route:** `backend/README.md:59` instructs users to visit `http://localhost:8000/health`, which does not exist in FastAPI (FastAPI mounts `/api/v1/health` and `/`, returning 404 on `/health`).
3. **Broken Documented Demo Routes:** `docs/LIVE_DEMO_WALKTHROUGH.md:41-43, 77` instructs presenters to open `http://localhost:5173/portal/send` and `http://localhost:5173/portal/home` on their phones for retail banking demo; neither `/portal/*` nor `/customer/*` routes are mounted in `src/App.tsx`, immediately crashing the live demo into `/unauthorized` redirects.
4. **Third-Party Telemetry & Privacy Leakage:** `IPGeospatialMap.tsx:188` loads OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/...`) and `index.html:8-11` loads Google Fonts/Material Symbols (`https://fonts.googleapis.com/...`). Both leak client IP addresses and user geographic viewports to external servers and will fail in offline or air-gapped financial networks.
5. **Inconsistent Localhost Referencing:** Mix of `http://localhost:8000` and `http://127.0.0.1:8000` across Vite proxy, Axios defaults, and backend CORS configuration, causing intermittent preflight failures on dual-stack IPv4/IPv6 Windows environments.

---

## 2. Link & Reference Audit Table

| Link or Reference | Location (file:line) | Purpose | Status | Evidence | Issue | Recommended Fix |
|---|---|---|---|---|---|---|
| `/favicon.svg` | `index.html:5` | Browser tab favicon | **Broken** (404) | File does not exist in `public/` directory | Missing asset causes 404 console errors on every page load | Create `public/favicon.svg` or remove link tag |
| `http://localhost:8000/health` | `backend/README.md:59` | Documented backend health endpoint | **Broken** (404) | Endpoint is registered at `/api/v1/health` and `/`, not `/health` | Misleads developers; automated monitoring following README will fail | Update `backend/README.md` to reference `/api/v1/health` |
| `http://localhost:5173/portal/send` | `docs/LIVE_DEMO_WALKTHROUGH.md:41, 77` | Documented customer transfer portal for live phone demo | **Broken** (Redirect) | No `/portal/*` route exists in `src/App.tsx` | Presenters following walkthrough will be redirected to `/unauthorized` or `/login` | Add `/customer/send-money` or `/portal/send` route in `src/App.tsx` |
| `http://localhost:5173/portal/home` | `docs/LIVE_DEMO_WALKTHROUGH.md:42, 43` | Documented customer home portal for live phone demo | **Broken** (Redirect) | No `/portal/*` route exists in `src/App.tsx` | Presenters following walkthrough will be redirected to `/unauthorized` or `/login` | Mount `CustomerHome` in `src/App.tsx` at `/portal/home` or `/customer/home` |
| `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | `src/components/transactions/IPGeospatialMap.tsx:188` | OpenStreetMap tile layer for IP geospatial map | **Active** (External CDN) | Verified HTTP 200 on tile request (`a.tile.openstreetmap.org`) | Leaks investigator IP and map queries to external third-party; fails in air-gapped networks | Add local tile caching or an offline fallback option |
| `https://fonts.googleapis.com` & `https://fonts.gstatic.com` | `index.html:8-11`, `src/index.css:1-2` | Google Fonts & Material Symbols Outlined stylesheet | **Active** (External CDN) | Verified HTTP 200 on stylesheet request | Leaks client IP to Google; causes layout shift or blank icons in offline environments | Bundle fonts and icons locally via npm packages (`@fontsource/*`) |
| `http://127.0.0.1:8000` | `vite.config.ts:28`, `README.md:159`, `docs/INSTALLATION_GUIDE.md:68` | Vite dev proxy target and API root | **Active** (Local) | Verified in `vite.config.ts` | Discrepancy with `localhost:8000` in `src/api/env.ts` causes potential CORS confusion | Standardize all frontend proxy and API configs to `127.0.0.1:8000` |
| `http://localhost:8000/api/v1` | `src/api/env.ts:13`, `src/pages/Settings.tsx:13` | Axios fallback API base URL | **Active** (Local) | Verified in `src/api/env.ts` | Bypasses Vite proxy if `VITE_API_BASE_URL` is omitted and binds to `localhost` instead of `127.0.0.1` | Default to relative `/api/v1` so Vite proxy forwards requests seamlessly |
| `https://img.shields.io/*` | `README.md:3-8` | Documentation status badges (Python, FastAPI, React, Vite) | **Active** (External) | Verified standard Shields.io badges | Minor external CDN dependency for static readme | Keep as informational badges |
| `https://vitejs.dev/config/` | `vite.config.ts:5` | Vite configuration docs link comment | **Active** (External) | Standard Vite documentation link | None (comment only) | Keep as reference |
| `https://registry.npmjs.org/*` | `package-lock.json:44+` | npm registry download URLs | **Active** (Package Manager) | Standard npm lockfile registry targets | None (lockfile provenance) | Keep as reference |
| `public/textures/earth-blue-marble.jpg` | `public/textures/earth-blue-marble.jpg` | 1.46 MB unused globe texture | **Orphaned Asset** | File exists on disk but is never imported in `IntelligenceGlobe.tsx` | Unnecessary 1.46MB repository bloat | Remove or replace unused high-res texture |
