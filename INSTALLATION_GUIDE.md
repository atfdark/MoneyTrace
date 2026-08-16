# MoneyTrace Installation & Setup Guide

This guide provides end-to-end instructions for installing, configuring, and running **MoneyTrace** locally on Windows, macOS, or Linux.

---

## 1. System Prerequisites

| Component | Minimum Version | Recommended Version |
| :--- | :--- | :--- |
| **Python** | 3.10+ | 3.11 / 3.12 / 3.13 |
| **Node.js** | 18.0.0+ | 20.x or 22.x LTS |
| **npm** | 9.0.0+ | 10.x |
| **Database** | SQLite 3 (Built-in) | Local SQLite (`moneytrace.db`) |

---

## 2. Backend Setup (FastAPI)

### Step 2.1: Open Backend Directory
```bash
cd backend
```

### Step 2.2: (Optional) Create Python Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 2.3: Install Python Dependencies
```bash
pip install -r requirements.txt
pip install reportlab python-docx openpyxl matplotlib
```

### Step 2.4: Seed Historical Intelligence Data
Run the database seeders to populate demo accounts, transactions, alerts, recovery cases, and pre-generated reports:

```bash
# Seed 5,200 transactions & 120 fraud alerts across 35 days:
python scripts/seed_dashboard_data.py

# Seed multi-hop graph laundering and circular rings:
python scripts/seed_graph_data.py

# Seed asset recovery intelligence cases:
python scripts/seed_recovery_cases.py

# Seed realistic AI Copilot investigator conversations:
python scripts/seed_ai_chat.py

# Pre-generate sample PDF, DOCX, CSV, and XLSX reports:
python scripts/seed_reports_data.py
```

### Step 2.5: Start the FastAPI Server
```bash
# Windows / macOS / Linux
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

> 🌐 **Backend API Root:** `http://127.0.0.1:8000`  
> 📖 **Interactive Swagger UI:** `http://127.0.0.1:8000/docs`  
> 📑 **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`

---

## 3. Frontend Setup (React + Vite)

### Step 3.1: Open Root Project Directory
Open a second terminal window:

```bash
cd f:\codee\MoneyTrace
```

### Step 3.2: Install Frontend Dependencies
```bash
# Windows (PowerShell)
npm.cmd install

# Linux / macOS / Git Bash
npm install
```

### Step 3.3: Start Vite Development Server
```bash
# Windows (PowerShell)
npm.cmd run dev

# Linux / macOS / Git Bash
npm run dev
```

> 🖥️ **Web Application URL:** `http://localhost:5173`

---

## 4. Default Investigator Login Credentials

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Lead Investigator (Admin)** | `admin@moneytrace.dev` | `Admin@123456` | Full platform access, report generation, asset freezes |
| **SOC Analyst** | `analyst@moneytrace.dev` | `Analyst@123456` | Alert triage, case investigation, graph flow |

---

## 5. Verifying the Installation

Run the automated test scripts to ensure all engines and endpoints are 100% operational:

```bash
cd backend

python scripts/test_graph_endpoints.py
python scripts/test_recovery_endpoints.py
python scripts/test_dashboard_endpoints.py
python scripts/test_assistant_endpoints.py
python scripts/test_reports_endpoints.py
```

All 5 test suites should return **`[OK] PASSED SUCCESSFULLY`**.
