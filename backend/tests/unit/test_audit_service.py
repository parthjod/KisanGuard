"""Unit tests: Audit trail write, trust verification logging, and record consolidation."""

from __future__ import annotations

import pytest
from app.services.audit_service import audit_service


@pytest.mark.asyncio
async def test_audit_lifecycle_and_query():
    pred_id = "pred_unit_test_999"

    # 1. Log prediction
    await audit_service.log_prediction(
        prediction_id=pred_id,
        user_id="usr_tester",
        ward_id="RJ-JD-042",
        plot_id=None,
        model="wbgt-v1.2",
        inputs={"tmax_c": 40.0},
        outputs={"wbgt_c": 33.5, "severity": "HIGH"},
        confidence=0.91,
    )

    # 2. Log trust check
    await audit_service.log_trust_check(
        prediction_id=pred_id,
        flagged=False,
        reasons=[],
    )

    # 3. Log delivery
    await audit_service.log_delivery(
        prediction_id=pred_id,
        alert_id="alt_unit_999",
        channel="VOICE",
        language="hi",
        status="DELIVERED",
    )

    # 4. Query consolidated record
    record = await audit_service.query(pred_id)
    assert record["prediction_id"] == pred_id
    assert record["model"] == "wbgt-v1.2"
    assert record["user_id"] == "usr_tester"
    assert record["ward_id"] == "RJ-JD-042"
    assert record["outputs"]["wbgt_c"] == 33.5
    assert record["delivery"]["status"] == "DELIVERED"
    assert record["trust"]["confidence"] == 0.91
