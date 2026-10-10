"""Integration test: Lambda A2I callback reviewer approvals and alert firing."""

from __future__ import annotations

import pytest
from lambda.a2i_callback.handler import handler


def test_a2i_callback_approved_fires_alert():
    event = {
        "humanLoopName": "a2i_test_loop_1",
        "decision": "APPROVED",
        "reviewer_id": "rev_expert_42",
        "notes": "Verified against local IMD radar sensor",
    }
    result = handler(event, None)
    assert result["status"] == "SUCCESS"
    assert result["processed"] == 1
    assert result["results"][0]["decision"] == "APPROVED"


def test_a2i_callback_rejected_suppresses_alert():
    event = {
        "humanLoopName": "a2i_test_loop_2",
        "decision": "REJECTED",
        "reviewer_id": "rev_expert_42",
        "notes": "Sensor glitch, local rain detected",
    }
    result = handler(event, None)
    assert result["status"] == "SUCCESS"
    assert result["results"][0]["decision"] == "REJECTED"
    assert result["results"][0]["alert_fired"] is False
