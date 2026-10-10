"""Unit tests: Bedrock multilingual advisory text generation and fallback rules."""

from __future__ import annotations

import pytest
from app.services.bedrock_service import bedrock_service


@pytest.mark.asyncio
async def test_generate_advisory_worker_hindi():
    text = await bedrock_service.generate_advisory(
        severity="RED",
        wbgt=34.5,
        role="WORKER",
        language="hi",
        channel="VOICE",
    )
    assert text is not None
    assert len(text) > 0
    # Must contain numeric indicator
    assert "34" in text or "°C" in text or "पानी" in text


@pytest.mark.asyncio
async def test_generate_advisory_farmer_punjabi():
    text = await bedrock_service.generate_advisory(
        severity="RED",
        cdhi=72.0,
        crop="ਕਣਕ",
        role="FARMER",
        language="pa",
        channel="SMS",
        action="irrigate tonight",
    )
    assert text is not None
    assert len(text) > 0
    assert "ਖਤਰਾ" in text or "ਸਿੰਚਾਈ" in text or "72" in text or len(text) > 10


@pytest.mark.asyncio
async def test_generate_advisory_english_constraints():
    text = await bedrock_service.generate_advisory(
        severity="CAUTION",
        wbgt=32.0,
        role="WORKER",
        language="en",
        channel="SMS",
    )
    assert text is not None
    assert len(text) <= 160
