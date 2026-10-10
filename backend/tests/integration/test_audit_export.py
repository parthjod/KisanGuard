"""Integration test: GET /v1/audit/export endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_audit_export_csv_success(client: TestClient, auth_headers_admin: dict[str, str]):
    response = client.get(
        "/v1/audit/export?org_id=org_001&from=2026-09-01&to=2026-10-07&format=csv",
        headers=auth_headers_admin,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["org_id"] == "org_001"
    assert "download_url" in data
    assert "expires_at" in data
    assert data["record_count"] >= 1


def test_audit_export_json_success(client: TestClient, auth_headers_admin: dict[str, str]):
    response = client.get(
        "/v1/audit/export?org_id=org_001&from=2026-09-01&to=2026-10-07&format=json",
        headers=auth_headers_admin,
    )
    assert response.status_code == 200
    data = response.json()
    assert "download_url" in data
