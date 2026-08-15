# MoneyTrace API

AI Financial Crime Intelligence Platform - Backend

## Overview

This is the FastAPI backend for the MoneyTrace platform, designed to support modules for:

- **Authentication** - User management, JWT auth, RBAC
- **Banking Simulator** - Synthetic transaction generation
- **Fraud Detection** - Real-time anomaly detection
- **Money Flow Analysis** - Transaction graph analysis
- **Recovery Intelligence** - Asset freezing and recovery workflows
- **Reports** - Compliance and audit reporting
- **AI Assistant** - NLP-powered investigation assistance

## Requirements

- Python 3.12+
- PostgreSQL 15+
- Poetry (recommended) or pip

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your database and security settings.

### 3. Database Migration

```bash
# Generate a migration (after model changes)
alembic revision --autogenerate -m "migration message"

# Apply migrations
alembic upgrade head
```

### 4. Run the Server

```bash
uvicorn app.main:app --reload
```

Visit:

- API: [http://localhost:8000](http://localhost:8000)
- Health: [http://localhost:8000/health](http://localhost:8000/health)
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## API Architecture

### Routers

```
/api/v1/
├── /auth          # Authentication & authorization
├── /transactions  # Transaction management & history
├── /dashboard     # Dashboard statistics & overview
├── /alerts        # Alert management
├── /investigation # Investigation workflows
├── /graph         # Entity relationship graphs
├── /recovery      # Asset recovery intelligence
├── /reports       # Audit reports & compliance
└── /assistant     # AI-powered assistant
```

### Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI application
│   ├── config.py          # Pydantic Settings configuration
│   ├── database.py        # SQLAlchemy async session setup
│   │
│   ├── core/              # Core utilities
│   │   ├── exceptions.py  # Custom exception classes
│   │   └── responses.py   # Standard API response models
│   │
│   ├── models/            # SQLAlchemy ORM models
│   ├── schemas/           # Pydantic request/response schemas
│   ├── routes/            # API routers
│   │   └── api_v1/        # API v1 endpoints
│   ├── services/          # Business logic layer
│   └── utils/             # Utility functions
│
├── alembic/               # Database migrations
│
├── requirements.txt
├── .env.example
└── README.md
```

## Development

### Error Handling

All errors return a consistent JSON format:

```json
{
  "success": false,
  "message": "Error message",
  "details": {}
}
```

### Running Tests

```bash
pytest
```

## License

Proprietary - MoneyTrace Financial Intelligence
