"""API Route: GET /v1/wbgt — Hyperlocal WBGT + PSI Forecast."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from app.dependencies import get_current_user
from app.models.prediction import HourlyWBGTResponse
from app.services.wbgt_service import WBGTService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/wbgt", response_model=HourlyWBGTResponse)
async def get_wbgt_forecast(
    request: Request,
    ward_id: str = Query(..., description="Ward identifier, e.g. RJ-JD-042"),
    date: str = Query(..., description="Forecast date ISO format YYYY-MM-DD"),
    hours: int = Query(24, ge=1, le=48, description="Number of forecast hours (1-48)"),
    lang: str = Query("hi", description="ISO 639-1 language code for advisory"),
    user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Returns hourly hyperlocal Wet Bulb Globe Temperature (WBGT),
    Physiological Strain Index (PSI), and localized safety advisories.
    """
    model_bundle = getattr(request.app.state, "model1", None)
    service = WBGTService(model_bundle=model_bundle)

    work_intensity = user.get("work_intensity", "MODERATE")
    forecast = await service.get_forecast(
        ward_id=ward_id,
        date=date,
        hours=hours,
        lang=lang,
        work_intensity=work_intensity,
    )
    return forecast
