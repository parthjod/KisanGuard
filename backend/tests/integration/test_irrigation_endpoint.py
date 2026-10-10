"""Integration test: GET & POST /v1/irrigation endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_get_irrigation_recommendation_success(client: TestClient, auth_headers_farmer: dict[str, str]):
    response = client.get(
        "/v1/irrigation?plot_id=PB-LD-F-2847&water_available_m3=120.0&lang=pa",
        headers=auth_headers_farmer,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["plot_id"] == "PB-LD-F-2847"
    assert "recommendation" in data
    assert data["recommendation"]["action"] in ["IRRIGATE", "WAIT"]
    assert "mad_framework" in data
    assert "rl_state" in data
    assert "advisory" in data


def test_post_irrigation_action_success(client: TestClient, auth_headers_farmer: dict[str, str]):
    payload = {
        "plot_id": "PB-LD-F-2847",
        "action": "IRRIGATED",
        "litres_actual": 3800,
        "timestamp_ist": "2026-10-07T18:30:00+05:30",
    }
    response = client.post(
        "/v1/irrigation/action",
        json=payload,
        headers=auth_headers_farmer,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["action_logged"] is True
    assert "updated_yield_risk" in data
    assert "yield_loss_avoided_pct" in data
    assert "revenue_protected_inr" in data
