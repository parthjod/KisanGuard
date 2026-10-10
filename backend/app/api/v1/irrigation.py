"""API Route: GET & POST /v1/irrigation — PPO Irrigation Recommendation & Action Logging."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from app.dependencies import get_current_user
from app.models.irrigation import (
    IrrigationActionRequest,
    IrrigationActionResponse,
    IrrigationRecommendationResponse,
)
from app.services.irrigation_service import irrigation_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/irrigation", response_model=IrrigationRecommendationResponse)
async def get_irrigation_recommendation(
    plot_id: str = Query(..., description="Farmer's plot identifier e.g. PB-LD-F-2847"),
    water_available_m3: float | None = Query(None, description="Available irrigation water volume in m³"),
    lang: str = Query("hi", description="ISO 639-1 language code for advisory"),
    user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Returns RL PPO model recommendation (IRRIGATE / WAIT), recommended litres,
    optimal application timing, and MAD critical status.
    """
    recommendation = await irrigation_service.get_recommendation(
        plot_id=plot_id,
        water_available_m3=water_available_m3,
        lang=lang or user.get("language", "hi"),
    )
    return recommendation


@router.post("/irrigation/action", response_model=IrrigationActionResponse)
async def log_irrigation_action(
    payload: IrrigationActionRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Logs actual irrigation performed by farmer and recalculates updated yield risk counterfactuals.
    """
    result = await irrigation_service.log_action(
        plot_id=payload.plot_id,
        user_id=user.get("user_id"),
        action=payload.action,
        litres_actual=payload.litres_actual,
        timestamp_ist=payload.timestamp_ist,
    )
    return result
