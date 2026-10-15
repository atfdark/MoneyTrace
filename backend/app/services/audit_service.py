"""Centralized Enterprise Audit Trail Service — Compliance and SOC Tracking."""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Union
from uuid import UUID, uuid4

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog, AuditAction
from app.models.user import User

logger = logging.getLogger("moneytrace.audit")

# Keys to sanitize from audit details for privacy and security
SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "hashed_pin",
    "pin",
    "pin_hash",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "authorization",
    "api_key",
}


def sanitize_audit_details(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Recursively redact sensitive keys from audit event details."""
    if not data or not isinstance(data, dict):
        return {} if data is None else {"value": str(data)}

    sanitized: Dict[str, Any] = {}
    for key, value in data.items():
        if any(s in key.lower() for s in SENSITIVE_KEYS):
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_audit_details(value)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_audit_details(item) if isinstance(item, dict) else item
                for item in value
            ]
        elif isinstance(value, (UUID, datetime)):
            sanitized[key] = str(value)
        else:
            sanitized[key] = value
    return sanitized


def extract_client_info(request: Optional[Request]) -> tuple[str, Optional[str]]:
    """Extract client IP and user agent safely from FastAPI Request."""
    client_ip = "127.0.0.1"
    user_agent = None

    if request is not None:
        raw_ip = request.headers.get("x-forwarded-for") or (
            request.client.host if getattr(request, "client", None) else None
        )
        if raw_ip:
            client_ip = raw_ip.split(",")[0].strip()
        user_agent = request.headers.get("user-agent")
        if user_agent:
            user_agent = user_agent[:255]

    return client_ip, user_agent


class AuditService:
    """Enterprise Audit Trail manager for recording immutable compliance events."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def log_event(
        self,
        action: Union[str, AuditAction],
        target_type: str,
        target_id: str,
        user: Optional[User] = None,
        user_id: Optional[Union[UUID, str]] = None,
        user_name: Optional[str] = None,
        user_email: Optional[str] = None,
        user_role: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        commit: bool = True,
    ) -> AuditLog:
        """
        Record an enterprise audit event.

        Actor attribution logic:
        - If `user` is provided, user details are extracted from the verified User model.
        - If `user` is not provided, explicit user_name/role are used (e.g. anonymous/system).
        - Sensitive fields in `details` are automatically redacted.
        """
        # Resolve actor identity
        resolved_user_id: Optional[UUID] = None
        resolved_name: str = "System Engine"
        resolved_email: Optional[str] = None
        resolved_role: str = "system"

        if user is not None:
            resolved_user_id = user.id if isinstance(user.id, UUID) else UUID(str(user.id))
            resolved_name = user.full_name or "Unknown User"
            resolved_email = user.email
            resolved_role = (
                user.role.value if hasattr(user.role, "value") else str(user.role)
            )
        else:
            if user_id:
                resolved_user_id = (
                    user_id if isinstance(user_id, UUID) else UUID(str(user_id))
                )
            if user_name:
                resolved_name = user_name
            if user_email:
                resolved_email = user_email
            if user_role:
                resolved_role = user_role

        # Resolve client network metadata
        req_ip, req_ua = extract_client_info(request)
        final_ip = ip_address or req_ip
        final_ua = user_agent or req_ua

        # Action string
        action_str = action.value if hasattr(action, "value") else str(action).upper()

        # Sanitize details
        clean_details = sanitize_audit_details(details)

        now = datetime.now(timezone.utc)
        entry = AuditLog(
            id=uuid4(),
            user_id=resolved_user_id,
            user_name=resolved_name,
            user_email=resolved_email,
            user_role=resolved_role.lower(),
            action=action_str,
            target_type=target_type.upper(),
            target_id=str(target_id),
            details=clean_details,
            ip_address=final_ip,
            user_agent=final_ua,
            timestamp=now,
        )

        try:
            self.session.add(entry)
            if commit:
                await self.session.commit()
            else:
                await self.session.flush()
        except Exception as err:
            logger.error("Failed to persist audit log entry %s: %s", action_str, err)
            raise

        return entry
