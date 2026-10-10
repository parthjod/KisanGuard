"""API Route: POST /v1/webhook — Partner Alert Push."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, status

from app.dependencies import verify_partner_key
from app.models.alert import WebhookAlertRequest, WebhookAlertResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/webhook", response_model=WebhookAlertResponse, status_code=status.HTTP_202_ACCEPTED)
async def receive_partner_webhook(
    payload: WebhookAlertRequest,
    partner_id: str = Depends(verify_partner_key),
) -> Any:
    """
    Receives real-time alert notifications or claims triggers from verified partner
    organizations (insurance companies, agricultural departments, FPOs).
    """
    webhook_id = f"wh_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    logger.info(
        "partner_webhook_received",
        webhook_id=webhook_id,
        partner_id=partner_id,
        event=payload.event,
        ward_count=len(payload.ward_ids),
    )

    return {
        "webhook_id": webhook_id,
        "status": "ACCEPTED",
        "queued_at": now_iso,
    }
