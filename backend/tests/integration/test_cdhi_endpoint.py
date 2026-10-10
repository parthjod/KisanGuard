"""Integration test: GET /v1/cdhi endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_get_cdhi_prediction_success(client: TestClient, auth_headers_farmer: dict[str, str]):
    response = client.get(
        "/v1/cdhi?plot_id=PB-LD-F-2847&crop=wheat&stage=grain_filling&season=rabi&lang=pa",
        headers=auth_headers_farmer,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["plot_id"] == "PB-LD-F-2847"
    assert data["crop"] == "wheat"
    assert "cdhi" in data
    assert "score" in data["cdhi"]
    assert "yield_risk" in data
    assert "loss_pct_estimate" in data["yield_risk"]
    assert "forecast_14d" in data
    assert len(data["forecast_14d"]) == 14
    assert "advisory" in data


def test_get_cdhi_auto_stage_derivation(client: TestClient, auth_headers_farmer: dict[str, str]):
    # Omitting stage to test crop calendar auto-derivation
    response = client.get(
        "/v1/cdhi?plot_id=PB-LD-F-2847&crop=wheat",
        headers=auth_headers_farmer,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["stage"] in ["vegetative", "flowering", "grain_filling", "maturity"]


def test_get_cdhi_unsupported_crop(client: TestClient, auth_headers_farmer: dict[str, str]):
    response = client.get(
        "/v1/cdhi?plot_id=PB-LD-F-2847&crop=banana",
        headers=auth_headers_farmer,
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"] == "CROP_NOT_SUPPORTED"
