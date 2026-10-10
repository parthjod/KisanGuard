"""API Route: GET /v1/org/{id}/dashboard & GET /v1/org/{id}/report — Employer/FPO dashboards."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Path, Query

from app.dependencies import get_current_user
from app.models.org import OrgDashboardResponse, OrgReportResponse
from app.services.org_service import org_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/org/{org_id}/dashboard", response_model=OrgDashboardResponse)
async def get_org_dashboard(
    org_id: str = Path(..., description="Organization identifier e.g. org_001"),
    user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Returns aggregated workforce safety metrics, active ward alert levels,
    mandatory break compliance adherence, and monthly ESG impact indicators.
    """
    data = await org_service.get_dashboard(org_id)
    return data


@router.get("/org/{org_id}/report", response_model=OrgReportResponse)
async def get_org_esg_report(
    org_id: str = Path(..., description="Organization identifier e.g. org_001"),
    from_date: str | None = Query(None, alias="from", description="Report start date YYYY-MM-DD"),
    to_date: str | None = Query(None, alias="to", description="Report end date YYYY-MM-DD"),
    user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Generates downloadable audit compliance report for insurance renewal and ESG disclosures.
    """
    report = await org_service.get_report(
        org_id=org_id,
        from_date=from_date,
        to_date=to_date,
    )
    return report
