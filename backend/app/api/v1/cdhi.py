"""API Route: GET /v1/cdhi — Compound Drought–Heat Index + Yield Risk."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from app.dependencies import get_current_user
from app.models.prediction import CDHIResponse
from app.services.cdhi_service import CDHIService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/cdhi", response_model=CDHIResponse)
async def get_cdhi_prediction(
    request: Request,
    plot_id: str = Query(..., description="Farmer plot identifier e.g. PB-LD-F-2847"),
    crop: str = Query(..., description="Crop: wheat | rice | maize | sorghum | millet"),
    stage: str | None = Query(None, description="Crop growth stage (auto-derived if omitted)"),
    season: str | None = Query(None, description="Agricultural season: kharif | rabi | annual"),
    lang: str | None = Query(None, description="ISO 639-1 language code"),
    user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Returns Compound Drought–Heat Index (CDHI), calibrated yield-loss probability,
    and 14-day agricultural forecast.
    """
    model_bundle = getattr(request.app.state, "model2", None)
    service = CDHIService(model_bundle=model_bundle)

    target_lang = lang or user.get("language", "hi")
    prediction = await service.predict(
        plot_id=plot_id,
        crop=crop,
        stage=stage,
        season=season,
        lang=target_lang,
    )
    return prediction
