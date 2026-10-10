"""Pydantic v2 schemas for alert entities."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AlertItem(BaseModel):
    alert_id: str
    timestamp: datetime
    severity: str
    wbgt_c: float | None = None
    psi: float | None = None
    cdhi_score: float | None = None
    confidence: float
    a2i_reviewed: bool = False
    reviewer_action: str | None = None
    channel: str
    language: str
    delivered: bool = False
    delivered_at: datetime | None = None
    message_preview: str | None = None
    user_acknowledged: bool = False
    ward_id: str | None = None
    plot_id: str | None = None


class AlertHistoryResponse(BaseModel):
    user_id: str
    total: int
    page: int
    page_size: int
    alerts: list[AlertItem]


class WebhookRequest(BaseModel):
    partner_id: str
    event: str
    ward_ids: list[str]
    timestamp: datetime
    payload: dict


class WebhookResponse(BaseModel):
    webhook_id: str
    status: str = "ACCEPTED"
    queued_at: datetime
