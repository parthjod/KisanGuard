"""End-to-end integration tests: User onboarding, prediction, trust checks, and alert fatigue."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_end_to_end_worker_registration_and_forecast(
    client: TestClient,
    auth_headers_worker: dict[str, str],
):
    # 1. Register new worker
    user_payload = {
        "cognito_sub": "sub-worker-integration-001",
        "name": "Raju Kumar",
        "role": "WORKER",
        "phone": "+919876543210",
        "language": "hi",
        "ward_id": "RJ-JD-042",
        "work_intensity": "HEAVY",
        "subscription_tier": "FREE",
        "consent_given": True,
        "consent_timestamp": "2026-10-07T10:00:00Z",
    }
    reg_resp = client.post("/v1/users", json=user_payload, headers=auth_headers_worker)
    assert reg_resp.status_code == 201
    user_id = reg_resp.json()["user_id"]
    assert user_id.startswith("usr_")

    # 2. Fetch User Profile (verifies KMS PII decryption)
    get_resp = client.get(f"/v1/users/{user_id}", headers=auth_headers_worker)
    assert get_resp.status_code == 200
    profile = get_resp.json()
    assert profile["name"] == "Raju Kumar"
    assert profile["phone"] == "+919876543210"

    # 3. Request Hyperlocal WBGT forecast
    wbgt_resp = client.get(
        f"/v1/wbgt?ward_id={profile['ward_id']}&date=2026-10-07&hours=24&lang=hi",
        headers=auth_headers_worker,
    )
    assert wbgt_resp.status_code == 200
    forecast = wbgt_resp.json()
    assert len(forecast["hourly"]) == 24
    assert forecast["daily_summary"]["peak_wbgt_c"] > 0

    # 4. Fetch Alert History for User
    alerts_resp = client.get(f"/v1/alerts?user_id={user_id}", headers=auth_headers_worker)
    assert alerts_resp.status_code == 200
    alert_history = alerts_resp.json()
    assert "alerts" in alert_history

    # 5. Right to Erasure (DPDP Act 2023)
    del_resp = client.delete(f"/v1/users/{user_id}", headers=auth_headers_worker)
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "ERASED"

    # 6. Verify subsequent lookup returns 404
    get_after_del = client.get(f"/v1/users/{user_id}", headers=auth_headers_worker)
    assert get_after_del.status_code == 404
