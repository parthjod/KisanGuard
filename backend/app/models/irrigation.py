"""Pydantic v2 schemas for irrigation entities."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IrrigationRecommendation(BaseModel):
    action: str  # IRRIGATE | WAIT
    litres: int
    timing_ist: str
    timing_rationale: str
    expected_yield_improvement_pct: float
    water_use_efficiency_gain_pct: float
    next_irrigation_est: str | None = None


class MADFramework(BaseModel):
    current_soil_moisture_pct: float
    mad_threshold_pct: float
    deficit_pct: float
    critical: bool


class RLState(BaseModel):
    soil_moisture_pct: float
    crop_stage: str
    crop_stage_enc: int
    cdhi_score: float
    water_available_m3: float


class IrrigationResponse(BaseModel):
    plot_id: str
    computed_at: str
    model_used: str
    model_version: str
    recommendation: IrrigationRecommendation
    mad_framework: MADFramework
    rl_state: RLState
    advisory: str


class IrrigationActionRequest(BaseModel):
    plot_id: str
    action: str = "IRRIGATED"
    litres_actual: float
    timestamp_ist: str


class UpdatedYieldRisk(BaseModel):
    high_risk_probability: float
    loss_pct_estimate: float
    risk_category: str


class IrrigationActionResponse(BaseModel):
    plot_id: str
    action_logged: bool = True
    updated_yield_risk: UpdatedYieldRisk
    yield_loss_avoided_pct: float
    revenue_protected_inr: float
