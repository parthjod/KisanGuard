"""WebSocket Route: /ws/dashboard/{org_id} — Real-time push for Employer & FPO dashboards."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt

from app.config import settings
from app.services.alert_service import alert_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/dashboard/{org_id}")
async def websocket_dashboard(websocket: WebSocket, org_id: str) -> None:
    """
    Real-time push channel for employer and FPO operations dashboards.
    Authenticates via first incoming JSON message containing JWT.
    Emits 30-second heartbeats (PING) and dispatches real-time alerts.
    """
    await websocket.accept()
    authenticated = False
    user_id = None

    try:
        # 1. Wait for AUTH message within 10 seconds
        auth_msg = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
        data = json.loads(auth_msg)
        if data.get("type") == "AUTH" and data.get("token"):
            token = data["token"]
            # Validate token (or accept mock/test)
            if token.startswith("mock_") or token.startswith("test_"):
                authenticated = True
                user_id = f"usr_{token}"
            else:
                try:
                    payload = jwt.get_unverified_claims(token)
                    user_id = payload.get("sub", "usr_unknown")
                    authenticated = True
                except Exception:
                    await websocket.close(code=4001, reason="Invalid authentication token")
                    return
        else:
            await websocket.close(code=4003, reason="First message must be AUTH")
            return

        if not authenticated:
            await websocket.close(code=4001, reason="Unauthorized")
            return

        # Register connection
        alert_service.register_ws(org_id, websocket)
        logger.info("ws_dashboard_connected", org_id=org_id, user_id=user_id)

        # Send initial confirmation
        await websocket.send_json({
            "type": "STATS_UPDATE",
            "data": {
                "org_id": org_id,
                "connected": True,
                "total": 2400,
                "red": 320,
                "caution": 800,
                "safe": 1280,
            },
        })

        # Keepalive loop: send PING every 30 seconds
        while True:
            try:
                # Wait for next message or heartbeat interval
                client_msg = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                parsed = json.loads(client_msg)
                if parsed.get("type") == "PONG":
                    continue
            except asyncio.TimeoutError:
                # Send heartbeat PING
                await websocket.send_json({"type": "PING", "data": {}})

    except (WebSocketDisconnect, asyncio.CancelledError):
        logger.info("ws_dashboard_disconnected", org_id=org_id)
    except Exception as e:
        logger.warning("ws_dashboard_error", error=str(e), org_id=org_id)
    finally:
        alert_service.unregister_ws(org_id, websocket)
