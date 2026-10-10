"""Pydantic v2 schemas for org/employer dashboard entities."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class WardStatus(BaseModel):
    ward_id: str
    severity: str
    worker_count: int
    wbgt_peak_c: float | None = None
    mandatory_rest_from_ist: str | None = None
    mandatory_rest_to_ist: str | None = None


class WorkerStats(BaseModel):
    total: int
    red_alert: int
    caution: int
    safe: int
    alerts_delivered_today: int
    delivery_success_rate: float


class ComplianceStats(BaseModel):
    mandatory_breaks_logged: int
    adherence_rate: float
    incidents_today: int


class ESGSummary(BaseModel):
    workdays_protected_this_month: int
    alerts_sent_this_month: int
    heatstroke_incidents_avoided_estimate: int


class OrgDashboardResponse(BaseModel):
    org_id: str
    org_name: str
    as_of: str
    workers: WorkerStats
    wards: list[WardStatus]
    compliance: ComplianceStats
    esg_summary: ESGSummary


class OrgReportResponse(BaseModel):
    org_id: str
    period: dict[str, Any]
    total_records: int
    esg_metrics: dict[str, Any]
    export_id: str
    download_url: str
    generated_at: str
