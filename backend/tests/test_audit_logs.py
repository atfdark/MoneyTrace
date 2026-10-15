"""Automated test suite for Enterprise Audit Trail — Security, RBAC, Persistence & Filtering."""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.database import Base, get_session
from app.models.user import User, UserRole
from app.models.account import Account, AccountStatus
from app.models.audit_log import AuditLog, AuditAction
from app.core.security import create_access_token, hash_password
from app.services.audit_service import AuditService, sanitize_audit_details


@pytest_asyncio.fixture
async def test_env():
    """Create an isolated in-memory SQLite database and test users."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

    # Initialize tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed isolated users
    admin_id = uuid4()
    investigator_id = uuid4()
    customer_id = uuid4()

    async with async_session() as session:
        admin = User(
            id=admin_id,
            full_name="Audit Admin",
            email="audit_admin@moneytrace.test",
            password_hash=hash_password("AdminPass123!"),
            role=UserRole.ADMIN.value,
            is_active=True,
        )
        investigator = User(
            id=investigator_id,
            full_name="Audit Investigator",
            email="audit_inv@moneytrace.test",
            password_hash=hash_password("InvPass123!"),
            role=UserRole.INVESTIGATOR.value,
            is_active=True,
        )
        customer = User(
            id=customer_id,
            full_name="Audit Customer",
            email="audit_cust@moneytrace.test",
            password_hash=hash_password("CustPass123!"),
            role=UserRole.CUSTOMER.value,
            is_active=True,
        )
        account = Account(
            id=uuid4(),
            account_number="ACC_AUDIT_01",
            user_id=customer_id,
            balance=Decimal("50000.00"),
            status=AccountStatus.FROZEN.value,
        )
        session.add_all([admin, investigator, customer, account])
        await session.commit()

    async def override_get_session():
        async with async_session() as s:
            yield s

    app.dependency_overrides[get_session] = override_get_session

    yield {
        "engine": test_engine,
        "session_maker": async_session,
        "admin_token": create_access_token(admin_id),
        "investigator_token": create_access_token(investigator_id),
        "customer_token": create_access_token(customer_id),
        "admin_id": admin_id,
        "investigator_id": investigator_id,
        "customer_id": customer_id,
    }

    # Teardown
    app.dependency_overrides.clear()
    await test_engine.dispose()


@pytest_asyncio.fixture
async def client(test_env):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(client: AsyncClient, test_env):
    """Unauthenticated requests must be rejected with 401."""
    res = await client.get("/api/v1/audit-logs")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_unauthorized_customer_role_rejected(client: AsyncClient, test_env):
    """Customer role must receive 403 Forbidden."""
    headers = {"Authorization": f"Bearer {test_env['customer_token']}"}
    res = await client.get("/api/v1/audit-logs", headers=headers)
    assert res.status_code == 403
    assert "Access denied" in res.json().get("detail", "")


@pytest.mark.asyncio
async def test_authorized_investigator_and_admin_access(client: AsyncClient, test_env):
    """Authorized roles can access audit logs with or without trailing slash (no 307 redirect)."""
    admin_headers = {"Authorization": f"Bearer {test_env['admin_token']}"}
    inv_headers = {"Authorization": f"Bearer {test_env['investigator_token']}"}

    # Without trailing slash
    res1 = await client.get("/api/v1/audit-logs", headers=admin_headers)
    assert res1.status_code == 200
    assert "logs" in res1.json()

    # With trailing slash
    res2 = await client.get("/api/v1/audit-logs/", headers=inv_headers)
    assert res2.status_code == 200
    assert "logs" in res2.json()


@pytest.mark.asyncio
async def test_real_action_creates_persisted_audit_record(client: AsyncClient, test_env):
    """Executing an application action persists an audit record that can be retrieved via API."""
    inv_headers = {"Authorization": f"Bearer {test_env['investigator_token']}"}

    # 1. Perform unfreeze action
    unfreeze_res = await client.post(
        "/api/v1/users/accounts/ACC_AUDIT_01/unfreeze",
        json={"reason": "Cleared by compliance audit"},
        headers=inv_headers,
    )
    assert unfreeze_res.status_code == 200
    assert unfreeze_res.json()["status"] == "ACTIVE"

    # 2. Retrieve audit logs via API
    logs_res = await client.get("/api/v1/audit-logs", headers=inv_headers)
    assert logs_res.status_code == 200
    data = logs_res.json()
    assert data["total"] >= 1

    unfreeze_log = next((l for l in data["logs"] if l["action"] == "ACCOUNT_UNFROZEN"), None)
    assert unfreeze_log is not None
    assert unfreeze_log["user_name"] == "Audit Investigator"
    assert unfreeze_log["target_id"] == "ACC_AUDIT_01"
    assert unfreeze_log["target_type"] == "ACCOUNT"
    assert unfreeze_log["details"]["reason"] == "Cleared by compliance audit"


@pytest.mark.asyncio
async def test_search_and_action_type_filtering(client: AsyncClient, test_env):
    """Search and action-type filters correctly narrow down results."""
    session_maker = test_env["session_maker"]
    async with session_maker() as session:
        audit_svc = AuditService(session)
        await audit_svc.log_event(
            action=AuditAction.CASE_CREATED,
            target_type="CASE",
            target_id="CASE-2026-X01",
            user_name="Forensic Agent",
            user_role="investigator",
            details={"title": "Suspicious shell routing"},
            commit=True,
        )
        await audit_svc.log_event(
            action=AuditAction.REPORT_GENERATED,
            target_type="REPORT",
            target_id="REP-2026-X02",
            user_name="Compliance Officer",
            user_role="supervisor",
            details={"type": "SAR"},
            commit=True,
        )

    headers = {"Authorization": f"Bearer {test_env['admin_token']}"}

    # Filter by action CASE_CREATED
    res_case = await client.get("/api/v1/audit-logs?action=CASE_CREATED", headers=headers)
    assert res_case.status_code == 200
    logs = res_case.json()["logs"]
    assert all(l["action"] == "CASE_CREATED" for l in logs)

    # Search by target keyword
    res_search = await client.get("/api/v1/audit-logs?search=CASE-2026-X01", headers=headers)
    assert res_search.status_code == 200
    assert len(res_search.json()["logs"]) == 1
    assert res_search.json()["logs"][0]["target_id"] == "CASE-2026-X01"


@pytest.mark.asyncio
async def test_action_types_endpoint(client: AsyncClient, test_env):
    """GET /api/v1/audit-logs/actions/types returns supported distinct action types."""
    headers = {"Authorization": f"Bearer {test_env['admin_token']}"}
    res = await client.get("/api/v1/audit-logs/actions/types", headers=headers)
    assert res.status_code == 200
    actions = res.json().get("actions", [])
    assert "LOGIN" in actions
    assert "ACCOUNT_FROZEN" in actions
    assert "ACCOUNT_UNFROZEN" in actions


@pytest.mark.asyncio
async def test_pagination_limits_enforced(client: AsyncClient, test_env):
    """Bounded pagination is enforced."""
    headers = {"Authorization": f"Bearer {test_env['admin_token']}"}

    # page_size=2
    res = await client.get("/api/v1/audit-logs?page=1&page_size=2", headers=headers)
    assert res.status_code == 200
    assert res.json()["page_size"] == 2

    # page_size > 100 rejected by validation
    res_invalid = await client.get("/api/v1/audit-logs?page=1&page_size=101", headers=headers)
    assert res_invalid.status_code == 422


@pytest.mark.asyncio
async def test_sensitive_credentials_redacted():
    """Sensitive keys (passwords, tokens, PINs) are redacted from event details."""
    raw_details = {
        "account_id": "ACC1001",
        "password": "SecretPassword123!",
        "transaction_pin": "9999",
        "nested": {"token": "jwt-bearer-xyz", "safe_info": "visible"},
    }
    sanitized = sanitize_audit_details(raw_details)
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["transaction_pin"] == "[REDACTED]"
    assert sanitized["nested"]["token"] == "[REDACTED]"
    assert sanitized["nested"]["safe_info"] == "visible"
