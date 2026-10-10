"""Integration test: GET /v1/wbgt endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_get_wbgt_forecast_success(client: TestClient, auth_headers_worker: dict[str, str]):
    response = client.get(
        "/v1/wbgt?ward_id=RJ-JD-042&date=2026-10-07&hours=24&lang=hi",
        headers=auth_headers_worker,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ward_id"] == "RJ-JD-042"
    assert data["state"] == "Rajasthan"
    assert "hourly" in data
    assert len(data["hourly"]) == 24
    assert "daily_summary" in data
    assert "peak_wbgt_c" in data["daily_summary"]
    assert "confidence" in data


def test_get_wbgt_requires_auth(client: TestClient):
    response = client.get("/v1/wbgt?ward_id=RJ-JD-042&date=2026-10-07")
    assert response.status_code == 401


def test_get_wbgt_ward_not_found(client: TestClient, auth_headers_worker: dict[str, str]):
    response = client.get(
        "/v1/wbgt?ward_id=UNKNOWN-999&date=2026-10-07",
        headers=auth_headers_worker,
    )
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "WARD_NOT_FOUND"
