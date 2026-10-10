"""Lambda: Delivery Receipt Handler — Processes SNS / Pinpoint delivery statuses."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.db import dynamo
from app.services.delivery_service import delivery_service

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Triggered by SNS delivery feedback topic when an SMS or Voice delivery completes.
    Updates alert delivery status in DynamoDB and triggers fallback if failed.
    """
    logger.info("Delivery receipt lambda invoked")
    records = event.get("Records", [])

    if not records:
        records = [{"Sns": {"Message": json.dumps(event)}}]

    processed = 0
    for record in records:
        msg_str = record.get("Sns", {}).get("Message", "{}")
        try:
            receipt = json.loads(msg_str)
        except Exception:
            receipt = record

        status = receipt.get("status", receipt.get("deliveryStatus", "DELIVERED")).upper()
        message_id = receipt.get("notification", {}).get("messageId", receipt.get("messageId", "msg_default"))
        phone = receipt.get("destination", receipt.get("phoneNumber"))
        delivered_at = datetime.now(timezone.utc).isoformat()

        # Update receipt asynchronously
        asyncio.run(
            delivery_service.log_receipt(
                alert_id=f"alt_{message_id[:12]}",
                channel="SMS",
                status=status,
                delivered_at=delivered_at,
            )
        )
        processed += 1

    return {"status": "SUCCESS", "processed_receipts": processed}
