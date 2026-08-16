"""WebSocket Connection Manager for Real-Time MoneyTrace Banking Simulation."""

from typing import List, Dict, Any
import json
import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts real-time events."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Broadcast an event to all connected clients."""
        if not self.active_connections:
            return

        message = {
            "type": event_type,
            "data": data,
        }
        raw_msg = json.dumps(message, default=str)
        dead_connections = []

        for connection in list(self.active_connections):
            try:
                await connection.send_text(raw_msg)
            except Exception as e:
                logger.warning(f"Error sending message to WebSocket client: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


# Global singleton instance
ws_manager = ConnectionManager()
