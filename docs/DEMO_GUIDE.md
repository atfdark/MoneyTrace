# 🚨 MoneyTrace Live Demonstration & Presentation Master Guide

> **Official Step-by-Step Flow Guide for Viva Presentations & Multi-User Live Demos**

Please refer to the comprehensive guide in [`docs/LIVE_DEMO_WALKTHROUGH.md`](./LIVE_DEMO_WALKTHROUGH.md) for full screenshots, credentials tables, and script talking points.

---

## ⚡ Quick Start Commands

```powershell
# 1. Backend Server
cd backend
python -m uvicorn app.main:app --reload --port 8000

# 2. Frontend App
npm.cmd run dev

# 3. (Optional) Background Live Traffic Simulator
cd backend
python scripts/simulate_live_traffic.py
```

---

## 🎬 7-Step Live Demonstration Flow

```mermaid
graph TD
    A["1. Open SOC Dashboard (admin@moneytrace.dev)"] --> B["2. Customer Sends ₹2,500 (Normal)"]
    B --> C["3. Send ₹85,000 Fraud Transfer / Click [High Risk Txn]"]
    C --> D["4. Siren Sounds + Red Vignette + AI Summary"]
    D --> E["5. Investigator Clicks 1-Click Freeze Account"]
    E --> F["6. Trace Flow Graph & Mule Chains in /flow"]
    F --> G["7. AI Copilot RAG & 1-Click Court PDF Export"]
```

### Flow Highlights:
1. **SOC Dashboard Overview**: Show the live scrolling ticker, 20-node presence monitor, threat radar, and regional heatmap.
2. **Normal Transaction**: Rahul transfers ₹2,500 to Sneha $\rightarrow$ 0-second live toast, ticker green badge, balance updates.
3. **Fraud Attack**: Rahul transfers ₹85,000 to Aman $\rightarrow$ full-screen red pulsing vignette, Web Audio siren sounds, emergency tactical card appears with AI Copilot summary.
4. **1-Click Freeze**: Investigator clicks `[Freeze Account]` $\rightarrow$ status locks across database and all connected portals.
5. **Flow Visualizer (`/flow`)**: View multi-hop layering, large glowing particles, and circular laundering loops ($A \rightarrow B \rightarrow C \rightarrow A$).
6. **AI Copilot Pro (`/chat`)**: Inspect ML typology confidence (88.5%), explainable feature importance, and offline RBI RAG legal citations.
7. **Asset Recovery & Reports (`/recovery` & `/reports`)**: View 85% recovery feasibility and download court-admissible PDF / Word / Excel dossiers.

---

## 🔑 Login Cheat Sheet

- **Lead Investigator / Admin**: `admin@moneytrace.dev` / `Admin@123456`
- **SOC Investigator**: `investigator@moneytrace.dev` / `Invest123`
- **Customer Accounts (`ACC1001` - `ACC1020`)**: `rahul@moneytrace.dev`, `sneha@moneytrace.dev`, `aman@moneytrace.dev`, etc. (Password: `Customer@123`)
