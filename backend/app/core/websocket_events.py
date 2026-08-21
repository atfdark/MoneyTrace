"""Centralized WebSocket Events and Presence Manager for MoneyTrace."""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from uuid import UUID
from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Standard Event Types
class WSEventTypes:
    TRANSACTION_CREATED = "TRANSACTION_CREATED"
    TRANSACTION_COMPLETED = "TRANSACTION_COMPLETED"
    HIGH_RISK_TRANSACTION = "HIGH_RISK_TRANSACTION"
    FRAUD_ALERT_CREATED = "FRAUD_ALERT_CREATED"
    RECOVERY_CASE_CREATED = "RECOVERY_CASE_CREATED"
    ACCOUNT_FLAGGED = "ACCOUNT_FLAGGED"
    ACCOUNT_FROZEN = "ACCOUNT_FROZEN"
    USER_CONNECTED = "USER_CONNECTED"
    USER_DISCONNECTED = "USER_DISCONNECTED"
    USER_STATUS_CHANGED = "USER_STATUS_CHANGED"
    ACTIVE_USERS_UPDATED = "ACTIVE_USERS_UPDATED"
    SIMULATION_EVENT = "SIMULATION_EVENT"


class ConnectedUser:
    """Represents a connected user session with real-time metadata."""
    def __init__(
        self,
        websocket: WebSocket,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        account_number: Optional[str] = None,
        role: Optional[str] = None,
    ):
        self.websocket = websocket
        self.user_id = user_id or "anonymous"
        self.username = username or "Anonymous User"
        self.account_number = account_number or "ACC_GUEST"
        self.role = role or "GUEST"
        self.connected_at = datetime.now(timezone.utc).isoformat()
        self.last_activity = datetime.now(timezone.utc).isoformat()
        self.online_status = "online"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "account_number": self.account_number,
            "role": self.role,
            "connected_at": self.connected_at,
            "last_activity": self.last_activity,
            "online_status": self.online_status,
        }


class CentralizedWebSocketManager:
    """Manages WebSocket connections, presence monitoring, and event distribution."""

    def __init__(self):
        self.connections: List[ConnectedUser] = []
        # Predefined demo presence pool so 15-20 users appear active during demo
        self.demo_presence_pool: List[Dict[str, Any]] = [
            {"user_id": "u-rahul", "username": "Rahul Sharma", "account_number": "ACC1001", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-sneha", "username": "Sneha Patel", "account_number": "ACC1002", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-aman", "username": "Aman Verma", "account_number": "ACC1003", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-priya", "username": "Priya Nair", "account_number": "ACC1004", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-karan", "username": "Karan Malhotra", "account_number": "ACC1005", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-vikram", "username": "Vikram Singh", "account_number": "ACC1006", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-neha", "username": "Neha Gupta", "account_number": "ACC1007", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-rohit", "username": "Rohit Joshi", "account_number": "ACC1008", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-anita", "username": "Anita Desai", "account_number": "ACC1009", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-rajesh", "username": "Rajesh Kumar", "account_number": "ACC1010", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-suresh", "username": "Suresh Reddy", "account_number": "ACC1011", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-pooja", "username": "Pooja Shah", "account_number": "ACC1012", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-sanjay", "username": "Sanjay Mehta", "account_number": "ACC1013", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-meera", "username": "Meera Iyer", "account_number": "ACC1014", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-arjun", "username": "Arjun Kapoor", "account_number": "ACC1015", "role": "CUSTOMER", "online_status": "online"},
            {"user_id": "u-admin", "username": "Lead Investigator (Admin)", "account_number": "ACC_ADMIN", "role": "ADMIN", "online_status": "online"},
            {"user_id": "u-analyst", "username": "Senior SOC Analyst", "account_number": "ACC_ANALYST", "role": "ANALYST", "online_status": "online"},
        ]

    async def connect(
        self,
        websocket: WebSocket,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        account_number: Optional[str] = None,
        role: Optional[str] = None,
    ) -> ConnectedUser:
        await websocket.accept()
        conn = ConnectedUser(
            websocket=websocket,
            user_id=user_id,
            username=username,
            account_number=account_number,
            role=role,
        )
        self.connections.append(conn)
        logger.info(f"WebSocket connected: {conn.username} ({conn.role}). Total active: {len(self.connections)}")

        # Broadcast connection event
        await self.broadcast(
            WSEventTypes.USER_CONNECTED,
            {
                "user": conn.to_dict(),
                "total_active_sessions": len(self.connections),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
        return conn

    def disconnect(self, websocket: WebSocket):
        target = None
        for conn in self.connections:
            if conn.websocket == websocket:
                target = conn
                break

        if target:
            self.connections.remove(target)
            logger.info(f"WebSocket disconnected: {target.username}. Total active: {len(self.connections)}")

    async def update_activity(self, websocket: WebSocket):
        for conn in self.connections:
            if conn.websocket == websocket:
                conn.last_activity = datetime.now(timezone.utc).isoformat()
                conn.online_status = "online"
                break

    def get_active_users(self) -> List[Dict[str, Any]]:
        """Return combined list of live connected users and demo pool users."""
        live_users = [c.to_dict() for c in self.connections if c.user_id != "anonymous"]
        live_account_numbers = {u["account_number"] for u in live_users}

        # Merge with demo pool (avoid duplicates)
        result = list(live_users)
        for demo in self.demo_presence_pool:
            if demo["account_number"] not in live_account_numbers:
                demo_copy = dict(demo)
                demo_copy["connected_at"] = datetime.now(timezone.utc).isoformat()
                demo_copy["last_activity"] = datetime.now(timezone.utc).isoformat()
                result.append(demo_copy)

        return result

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Broadcast structured event to all active WebSocket clients."""
        if not self.connections:
            return

        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        raw_msg = json.dumps(payload, default=str)
        dead_connections: List[ConnectedUser] = []

        for conn in list(self.connections):
            try:
                await conn.websocket.send_text(raw_msg)
            except Exception as e:
                logger.warning(f"Failed to send WS message to {conn.username}: {e}")
                dead_connections.append(conn)

        for dead in dead_connections:
            if dead in self.connections:
                self.connections.remove(dead)


# Global singleton
ws_events_manager = CentralizedWebSocketManager()
