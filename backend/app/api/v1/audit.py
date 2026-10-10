"""API Route: GET /v1/audit & GET /v1/audit/export — Full Prediction Audit Trail & ESG Exports."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from app.models.audit import AuditExportResponse, AuditRecordResponse
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/audit", response_model=AuditRecordResponse)
async def get_audit_record(
    prediction_id: str = Query(..., description="Unique prediction identifier e.g. pred_def456"),
    user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Returns immutable audit trail for a specific prediction,
    including inputs, model version, trust checks, reviewer notes, and delivery confirmation.
    """
    record = await audit_service.query(prediction_id)
    return record


@router.get("/audit/export", response_model=AuditExportResponse)
async def export_audit_trail(
    org_id: str = Query(..., description="Organization identifier e.g. org_001"),
    from_date: str | None = Query(None, alias="from", description="Start date YYYY-MM-DD"),
    to_date: str | None = Query(None, alias="to", description="End date YYYY-MM-DD"),
    fmt: str = Query("csv", alias="format", description="Export format: csv | json"),
    user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Exports organization audit trail to S3 and returns a 24-hour pre-signed download URL
    for insurance renewal and ESG compliance reporting.
    """
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    start_dt = from_date or (now - timedelta(days=30)).strftime("%Y-%m-%d")
    end_dt = to_date or now.strftime("%Y-%m-%d")

    export_id, count, download_url = await audit_service.export_org(
        org_id=org_id,
        from_dt=start_dt,
        to_dt=end_dt,
        fmt=fmt,
    )

    expires_at = (now + timedelta(hours=24)).isoformat()

    return {
        "export_id": export_id,
        "org_id": org_id,
        "from": start_dt,
        "to": end_dt,
        "record_count": count,
        "download_url": download_url,
        "expires_at": expires_at,
    }
