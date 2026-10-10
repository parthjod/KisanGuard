"""Unit tests: Alert Fatigue capping per user per severity."""

from __future__ import annotations

import pytest
from app.services.fatigue_service import FatigueService


@pytest.mark.asyncio
async def test_fatigue_red_cap_at_one():
    service = FatigueService()
    user_id = "usr_test_fatigue_1"

    # 1. First RED alert allowed
    can_send, reason = await service.can_send(user_id=user_id, severity="RED")
    assert can_send is True
    assert reason == "ok"

    # Increment today's count
    await service.increment(user_id=user_id, severity="RED")

    # 2. Second RED alert blocked
    can_send_second, reason_second = await service.can_send(user_id=user_id, severity="RED")
    assert can_send_second is False
    assert "cap_reached" in reason_second


@pytest.mark.asyncio
async def test_fatigue_caution_cap_at_three():
    service = FatigueService()
    user_id = "usr_test_fatigue_2"

    for i in range(3):
        can_send, _ = await service.can_send(user_id=user_id, severity="CAUTION")
        assert can_send is True
        await service.increment(user_id=user_id, severity="CAUTION")

    # Fourth CAUTION alert blocked
    can_send_fourth, reason = await service.can_send(user_id=user_id, severity="CAUTION")
    assert can_send_fourth is False
    assert "cap_reached" in reason


@pytest.mark.asyncio
async def test_fatigue_opt_out_suppression():
    service = FatigueService()
    user_id = "usr_test_fatigue_3"

    await service.opt_out(user_id=user_id, hours=24)

    can_send, reason = await service.can_send(user_id=user_id, severity="CAUTION")
    assert can_send is False
    assert "user_opted_out" in reason
