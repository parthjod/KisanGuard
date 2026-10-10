"""Pydantic v2 schemas for prediction outputs (WBGT + CDHI)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── WBGT (Feature 1) ────────────────────────────────────────────────────

class WBGTHourly(BaseModel):
    hour_utc: str
    hour_ist: str
    wbgt_c: float
    ta_c: float
    tnw_c: float
    tg_c: float
    humidity_pct: float
    psi: float
    severity: str
    safe_to_work: bool
    rest_minutes_per_hour: int
    water_litres_per_hour: float
    advisory: str


class WBGTDailySummary(BaseModel):
    peak_wbgt_c: float
    peak_hour_ist: str
    severity: str
    safe_work_windows_ist: list[str]
    mandatory_rest_hours_ist: list[str]
    advisory: str


class WBGTResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    ward_id: str
    district: str
    state: str
    date: str
    generated_at: str
    model_version: str
    data_freshness_minutes: float
    confidence: float
    a2i_flagged: bool = False
    a2i_decision: str | None = None
    hourly: list[WBGTHourly]
    daily_summary: WBGTDailySummary


HourlyWBGTResponse = WBGTResponse


# ── CDHI (Feature 2) ────────────────────────────────────────────────────

class CDHIComponents(BaseModel):
    heat_norm: float
    drought_norm: float
    ahsd_norm: float
    hdd_norm: float
    sma_norm: float


class CDHIInputs(BaseModel):
    tmax_mean_c: float
    spi_3: float
    ahsd_days: int
    hdd: float
    sma: float


class CDHIScore(BaseModel):
    score: float
    category: str
    components: CDHIComponents
    inputs: CDHIInputs


class YieldRisk(BaseModel):
    high_risk_probability: float
    loss_pct_estimate: float
    risk_category: str
    confidence: float
    crop_heat_threshold_c: float
    current_tmax_c: float
    stage_multiplier: float


class CDHIForecastDay(BaseModel):
    date: str
    cdhi_score: float
    cdhi_category: str
    loss_prob: float


class CDHIAdvisory(BaseModel):
    text: str
    language: str
    action: str | None = None


class CDHIResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    plot_id: str
    state: str
    crop: str
    stage: str
    season: str
    computed_at: str
    model_version: str
    confidence: float
    a2i_flagged: bool = False
    a2i_decision: str | None = None
    cdhi: CDHIScore
    yield_risk: YieldRisk
    forecast_14d: list[CDHIForecastDay]
    advisory: CDHIAdvisory
