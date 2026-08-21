"""WebSocket Connection Manager for Real-Time MoneyTrace Banking Simulation."""

from typing import Dict, Any, Optional
from fastapi import WebSocket
from app.core.websocket_events import ws_events_manager, WSEventTypes, ConnectedUser


class ConnectionManager:
    """Delegates to CentralizedWebSocketManager for full event and presence support."""

    def __init__(self):
        self.manager = ws_events_manager

    @property
    def active_connections(self):
        return [c.websocket for c in self.manager.connections]

    async def connect(
        self,
        websocket: WebSocket,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        account_number: Optional[str] = None,
        role: Optional[str] = None,
    ) -> ConnectedUser:
        return await self.manager.connect(
            websocket=websocket,
            user_id=user_id,
            username=username,
            account_number=account_number,
            role=role,
        )

    def disconnect(self, websocket: WebSocket):
        self.manager.disconnect(websocket)

    async def update_activity(self, websocket: WebSocket):
        await self.manager.update_activity(websocket)

    def get_active_users(self):
        return self.manager.get_active_users()

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        await self.manager.broadcast(event_type, data)


# Global singleton instance
ws_manager = ConnectionManager()
