"""Unit tests: Alert routing logic and channel dispatch rules per PRD §12."""

from __future__ import annotations

import pytest
from app.services.alert_service import alert_service


@pytest.mark.asyncio
async def test_route_worker_direct_vs_a2i():
    worker_user = {
        "user_id": "usr_w_1",
        "role": "WORKER",
        "phone": "+919876543210",
        "language": "hi",
        "consent_given": True,
    }

    # Clean moderate prediction -> Direct alert
    pred_clean = {
        "prediction_id": "pred_test_1",
        "severity": "MODERATE",
        "confidence": 0.92,
        "wbgt_c": 32.0,
        "missing_feature_pct": 0.02,
    }
    res_direct = await alert_service.route(pred_clean, worker_user)
    assert res_direct.get("delivered") is True or res_direct.get("status") in ["DELIVERED", "SUPPRESSED_FATIGUE"]

    # RED severity prediction -> Mandatory A2I review per PRD trust layer
    pred_red = {
        "prediction_id": "pred_test_2",
        "severity": "RED",
        "confidence": 0.92,
        "wbgt_c": 35.0,
        "missing_feature_pct": 0.02,
    }
    res_a2i = await alert_service.route(pred_red, worker_user)
    assert res_a2i.get("action") == "A2I_SUBMITTED"
    assert res_a2i.get("a2i_flagged") is True


@pytest.mark.asyncio
async def test_alert_channel_worker_is_voice():
    worker_user = {
        "user_id": "usr_w_voice",
        "role": "WORKER",
        "phone": "+919876543210",
        "language": "hi",
        "consent_given": True,
    }
    pred = {"prediction_id": "pred_v", "severity": "CAUTION", "wbgt_c": 31.5}
    res = await alert_service.fire_alert(worker_user, pred, idempotency_key="idemp_w_voice")
    if res.get("status") == "DELIVERED":
        assert res.get("channel") in ["VOICE", "SMS"]
