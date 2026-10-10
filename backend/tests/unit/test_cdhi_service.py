"""Unit tests: CDHI service inference and 14-day forecasting pipeline."""

from __future__ import annotations

import pytest
from app.services.cdhi_service import CDHIService


@pytest.mark.asyncio
async def test_cdhi_service_prediction_pipeline():
    service = CDHIService(model_bundle=None)
    result = await service.predict(
        plot_id="PB-LD-F-2847",
        crop="wheat",
        stage="grain_filling",
        season="rabi",
        lang="pa",
    )
    assert result["plot_id"] == "PB-LD-F-2847"
    assert result["crop"] == "wheat"
    assert "cdhi" in result
    assert "score" in result["cdhi"]
    assert "yield_risk" in result
    assert "forecast_14d" in result
    assert len(result["forecast_14d"]) == 14
    assert "advisory" in result


@pytest.mark.asyncio
async def test_cdhi_service_forecast_14d():
    service = CDHIService(model_bundle=None)
    forecast = await service.forecast_14d(
        plot_id="PB-LD-F-2847",
        crop="wheat",
        stage="flowering",
        state="Punjab",
    )
    assert len(forecast) == 14
    for day in forecast:
        assert "date" in day
        assert "cdhi_score" in day
        assert "cdhi_category" in day
        assert "loss_prob" in day
