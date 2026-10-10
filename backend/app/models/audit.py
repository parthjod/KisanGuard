"""Pydantic v2 schemas for audit trail records."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AuditTrust(BaseModel):
    confidence: float
    a2i_flagged: bool = False
    flag_reasons: list[str] = Field(default_factory=list)
    a2i_task_id: str | None = None
    a2i_decision: str | None = None
    reviewer_id: str | None = None
    reviewer_timestamp: datetime | None = None
    reviewer_notes: str | None = None


class AuditDelivery(BaseModel):
    channel: str
    language: str
    polly_voice: str | None = None
    status: str
    delivered_at: datetime | None = None
    idempotency_key: str


class AuditRecord(BaseModel):
    prediction_id: str
    alert_id: str | None = None
    user_id: str | None = None
    ward_id: str | None = None
    plot_id: str | None = None
    timestamp: datetime
    model: str
    inputs: dict
    outputs: dict
    trust: AuditTrust
    delivery: AuditDelivery | None = None


# Alias for response schema
AuditRecordResponse = AuditRecord


class AuditExportResponse(BaseModel):
    export_id: str
    org_id: str
    from_date: str = Field(alias="from")
    to_date: str = Field(alias="to")
    record_count: int
    download_url: str
    expires_at: datetime

    model_config = {"populate_by_name": True}
