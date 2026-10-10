"""Crop Calendar Service: Auto-derive crop stage from date + state + crop."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from app.config import settings
from app.db import dynamo

logger = logging.getLogger(__name__)

# Fallback calendar based on Govt. of India Directorate of Economics and Statistics (DES)
# Format: (state, crop, month) -> (stage, season)
DEFAULT_CALENDAR: dict[tuple[str, str, int], tuple[str, str]] = {
    # Punjab Wheat (Rabi)
    ("Punjab", "wheat", 11): ("vegetative", "rabi"),
    ("Punjab", "wheat", 12): ("vegetative", "rabi"),
    ("Punjab", "wheat", 1): ("flowering", "rabi"),
    ("Punjab", "wheat", 2): ("flowering", "rabi"),
    ("Punjab", "wheat", 3): ("grain_filling", "rabi"),
    ("Punjab", "wheat", 4): ("grain_filling", "rabi"),
    ("Punjab", "wheat", 5): ("maturity", "rabi"),
    # Rajasthan Wheat (Rabi)
    ("Rajasthan", "wheat", 11): ("vegetative", "rabi"),
    ("Rajasthan", "wheat", 12): ("vegetative", "rabi"),
    ("Rajasthan", "wheat", 1): ("flowering", "rabi"),
    ("Rajasthan", "wheat", 2): ("flowering", "rabi"),
    ("Rajasthan", "wheat", 3): ("grain_filling", "rabi"),
    ("Rajasthan", "wheat", 4): ("maturity", "rabi"),
    # Haryana Wheat (Rabi)
    ("Haryana", "wheat", 11): ("vegetative", "rabi"),
    ("Haryana", "wheat", 12): ("vegetative", "rabi"),
    ("Haryana", "wheat", 1): ("flowering", "rabi"),
    ("Haryana", "wheat", 2): ("flowering", "rabi"),
    ("Haryana", "wheat", 3): ("grain_filling", "rabi"),
    ("Haryana", "wheat", 4): ("grain_filling", "rabi"),
    ("Haryana", "wheat", 5): ("maturity", "rabi"),
    # Uttar Pradesh Wheat (Rabi)
    ("Uttar Pradesh", "wheat", 11): ("vegetative", "rabi"),
    ("Uttar Pradesh", "wheat", 12): ("vegetative", "rabi"),
    ("Uttar Pradesh", "wheat", 1): ("flowering", "rabi"),
    ("Uttar Pradesh", "wheat", 2): ("flowering", "rabi"),
    ("Uttar Pradesh", "wheat", 3): ("grain_filling", "rabi"),
    ("Uttar Pradesh", "wheat", 4): ("maturity", "rabi"),
    # Rice (Kharif: June - November)
    ("Punjab", "rice", 6): ("vegetative", "kharif"),
    ("Punjab", "rice", 7): ("vegetative", "kharif"),
    ("Punjab", "rice", 8): ("flowering", "kharif"),
    ("Punjab", "rice", 9): ("grain_filling", "kharif"),
    ("Punjab", "rice", 10): ("maturity", "kharif"),
    ("West Bengal", "rice", 6): ("vegetative", "kharif"),
    ("West Bengal", "rice", 7): ("vegetative", "kharif"),
    ("West Bengal", "rice", 8): ("flowering", "kharif"),
    ("West Bengal", "rice", 9): ("grain_filling", "kharif"),
    ("West Bengal", "rice", 10): ("maturity", "kharif"),
    # Maize (Kharif: June - October)
    ("Rajasthan", "maize", 7): ("vegetative", "kharif"),
    ("Rajasthan", "maize", 8): ("flowering", "kharif"),
    ("Rajasthan", "maize", 9): ("grain_filling", "kharif"),
    ("Rajasthan", "maize", 10): ("maturity", "kharif"),
    # Sorghum (Jowar)
    ("Maharashtra", "sorghum", 7): ("vegetative", "kharif"),
    ("Maharashtra", "sorghum", 8): ("flowering", "kharif"),
    ("Maharashtra", "sorghum", 9): ("grain_filling", "kharif"),
    ("Maharashtra", "sorghum", 10): ("maturity", "kharif"),
    # Millet (Bajra)
    ("Rajasthan", "millet", 7): ("vegetative", "kharif"),
    ("Rajasthan", "millet", 8): ("flowering", "kharif"),
    ("Rajasthan", "millet", 9): ("grain_filling", "kharif"),
    ("Rajasthan", "millet", 10): ("maturity", "kharif"),
}


class CropCalendarService:
    """
    Auto-derives crop stage and season from current date, state, and crop.
    Loads from DynamoDB kisanguard-crop-calendars with memory fallback.
    """

    def __init__(self) -> None:
        self._cache: dict[tuple[str, str, int], tuple[str, str]] = dict(DEFAULT_CALENDAR)

    async def get_stage_and_season(
        self,
        state: str,
        crop: str,
        date_str: str | None = None,
    ) -> tuple[str, str]:
        """
        Derives (stage, season) for given state, crop, and date.
        Defaults to ('grain_filling', 'rabi') if not matched.
        """
        if date_str:
            try:
                dt = datetime.fromisoformat(date_str)
                month = dt.month
            except ValueError:
                month = datetime.utcnow().month
        else:
            month = datetime.utcnow().month

        state_key = state.strip()
        crop_key = crop.lower().strip()

        # Check local cache first
        key = (state_key, crop_key, month)
        if key in self._cache:
            return self._cache[key]

        # Query DynamoDB if available
        try:
            sk = f"{crop_key}#{month}"
            item = await dynamo.get_item(settings.DYNAMO_CALENDARS_TABLE, pk=state_key, sk=sk)
            if item:
                stage = item.get("stage", "grain_filling")
                season = item.get("season", "rabi")
                self._cache[key] = (stage, season)
                return stage, season
        except Exception as e:
            logger.warning("crop_calendar_dynamo_lookup_failed", error=str(e))

        # Check any state fallback for this crop and month
        for (c_state, c_crop, c_month), (stage, season) in self._cache.items():
            if c_crop == crop_key and c_month == month:
                return stage, season

        # Safe fallback
        return "grain_filling", "rabi"

    async def get_stage(self, state: str, crop: str, date_str: str | None = None) -> str:
        stage, _ = await self.get_stage_and_season(state, crop, date_str)
        return stage

    async def get_season(self, state: str, crop: str, date_str: str | None = None) -> str:
        _, season = await self.get_stage_and_season(state, crop, date_str)
        return season


crop_calendar_service = CropCalendarService()
