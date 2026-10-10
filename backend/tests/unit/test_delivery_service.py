"""Unit tests: Delivery service idempotency and voice synthesis."""

from __future__ import annotations

import pytest
from app.services.delivery_service import delivery_service


@pytest.mark.asyncio
async def test_send_sms_idempotency():
    phone = "+919876543210"
    msg = "गर्मी की चेतावनी: पानी पिएं।"
    key = "idemp_sms_test_unique_key_1"

    # First send: DELIVERED
    resp1 = await delivery_service.send_sms(phone=phone, message=msg, lang="hi", idempotency_key=key)
    assert resp1["status"] in ["DELIVERED", "SKIPPED_IDEMPOTENT"]

    # Second send with same key: SKIPPED_IDEMPOTENT
    resp2 = await delivery_service.send_sms(phone=phone, message=msg, lang="hi", idempotency_key=key)
    assert resp2["status"] == "SKIPPED_IDEMPOTENT"


@pytest.mark.asyncio
async def test_send_voice_idempotency():
    phone = "+919876543210"
    msg = "High heat alert. Rest in shade."
    key = "idemp_voice_test_unique_key_1"

    resp1 = await delivery_service.send_voice(phone=phone, advisory_text=msg, lang="en", idempotency_key=key)
    assert resp1["status"] in ["DELIVERED", "SKIPPED_IDEMPOTENT"]

    resp2 = await delivery_service.send_voice(phone=phone, advisory_text=msg, lang="en", idempotency_key=key)
    assert resp2["status"] == "SKIPPED_IDEMPOTENT"
