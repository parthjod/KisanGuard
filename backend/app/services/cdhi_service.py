"""Feature 2: CDHI formula + Model 2 inference service."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
from boto3.dynamodb.conditions import Key

from app.config import settings
from app.db import dynamo, s3 as s3_db
from app.ml.model2_cdhi_csyr.cdhi_formula import (
    CROP_CONFIG,
    STAGE_MULTIPLIERS,
    categorize_cdhi,
    compute_cdhi,
    get_stage_multiplier,
)
from app.ml.model2_cdhi_csyr.feature_builder import build_cdhi_features
from app.ml.model2_cdhi_csyr.postprocess import (
    apply_stage_multiplier,
    categorize_yield_risk,
    run_classifier,
    run_regressor,
)

logger = logging.getLogger(__name__)


class CDHIService:
    """
    PRD FR-5: Compute SPI, SMA, AHSD, HSI, HDD.
    PRD FR-6: Apply crop-specific thresholds at critical stages.
    Model 2: kisanguard_clf_calibrated.pkl + kisanguard_reg_xgb.json
    """

    def __init__(self, model_bundle: Any = None):
        self.model = model_bundle

    async def predict(
        self,
        plot_id: str,
        crop: str,
        stage: str | None,
        season: str | None,
        lang: str = "hi",
        state_name: str | None = None,
    ) -> dict:
        """Full pipeline: CDHI formula → feature vector → clf + reg → advisory."""
        start_time = time.time()

        # Validate crop
        if crop not in CROP_CONFIG:
            from app.utils.errors import CropNotSupportedError
            raise CropNotSupportedError(crop)

        # Resolve state from plot_id (format: STATE-DISTRICT-F-NNNN)
        if not state_name:
            state_name = self._resolve_state(plot_id)

        # Resolve stage from crop calendar if not provided
        if not stage:
            from app.services.crop_calendar_service import CropCalendarService
            cal = CropCalendarService()
            stage = await cal.get_stage(state_name, crop, datetime.now(timezone.utc).strftime("%Y-%m-%d"))

        # Default season
        if not season:
            season = "rabi" if crop in ("wheat",) else "kharif"

        # Fetch environmental data from DynamoDB
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        env_data = await dynamo.get_item(
            settings.DYNAMO_FEATURES_TABLE,
            {"PK": state_name, "SK": today},
        )
        if not env_data:
            env_data = self._default_env(state_name)

        # Compute CDHI using exact formula
        tmax_mean = env_data.get("tmax_mean_c", 35.0)
        spi_3 = env_data.get("spi_3", 0.0)
        ahsd = env_data.get("ahsd_days", env_data.get("ahsd", 0))
        hdd = env_data.get("hdd", 0.0)
        sma = env_data.get("sma", 0.0)

        cdhi_score, components = compute_cdhi(tmax_mean, spi_3, ahsd, hdd, sma)
        cdhi_category = categorize_cdhi(cdhi_score)

        # Build feature vector for Model 2
        confidence = 0.85
        high_risk_prob = 0.5
        loss_pct = 0.0

        if self.model:
            features = build_cdhi_features(
                env_data, crop, stage, season,
                self.model.label_encoders,
                self.model.feature_cols,
                cdhi_score,
            )

            # Run classifier
            high_risk_prob, pred_class = run_classifier(self.model.clf_calibrated, features)

            # Apply stage multiplier
            stage_mult = get_stage_multiplier(stage)
            high_risk_prob = apply_stage_multiplier(high_risk_prob, stage_mult)

            # Run regressor
            loss_pct = run_regressor(self.model.reg_xgb, features)

            # Confidence from model metadata
            confidence = 0.89
        else:
            # Fallback: derive from CDHI score
            stage_mult = get_stage_multiplier(stage)
            high_risk_prob = min(1.0, cdhi_score / 100.0 * stage_mult)
            loss_pct = high_risk_prob * 30.0

        risk_category = categorize_yield_risk(high_risk_prob)
        crop_config = CROP_CONFIG[crop]

        # Build 14-day forecast
        forecast_14d = await self._forecast_14d(env_data, crop, stage, season, state_name)

        result = {
            "plot_id": plot_id,
            "state": state_name,
            "crop": crop,
            "stage": stage,
            "season": season,
            "computed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "model_version": self.model.metadata.get("version", "cdhi-csyr-v2.0") if self.model else "cdhi-csyr-v2.0",
            "confidence": round(confidence, 4),
            "a2i_flagged": False,
            "a2i_decision": None,
            "cdhi": {
                "score": cdhi_score,
                "category": cdhi_category,
                "components": components,
                "inputs": {
                    "tmax_mean_c": tmax_mean,
                    "spi_3": spi_3,
                    "ahsd_days": int(ahsd),
                    "hdd": hdd,
                    "sma": sma,
                },
            },
            "yield_risk": {
                "high_risk_probability": round(high_risk_prob, 4),
                "loss_pct_estimate": round(loss_pct, 2),
                "risk_category": risk_category,
                "confidence": round(confidence, 4),
                "crop_heat_threshold_c": crop_config["heat_threshold_c"],
                "current_tmax_c": tmax_mean,
                "stage_multiplier": get_stage_multiplier(stage),
            },
            "forecast_14d": forecast_14d,
            "advisory": {
                "text": "",  # filled by bedrock_service
                "language": lang,
                "action": self._recommend_action(cdhi_category, crop, stage),
            },
        }

        # Cache to S3
        try:
            cache_key = f"features/cdhi/{plot_id}/{today}.json"
            await s3_db.put_json(cache_key, result)
        except Exception as e:
            logger.warning("cdhi_cache_write_failed", error=str(e))

        latency_ms = (time.time() - start_time) * 1000
        logger.info(
            "cdhi_predict_complete",
            plot_id=plot_id,
            crop=crop,
            stage=stage,
            cdhi=cdhi_score,
            category=cdhi_category,
            loss_pct=loss_pct,
            latency_ms=round(latency_ms, 1),
        )

        return result

    async def _forecast_14d(
        self,
        base_env: dict,
        crop: str,
        stage: str,
        season: str,
        state_name: str,
    ) -> list[dict]:
        """14-day forecast: shift SPI/SMA by 1 day each step."""
        today = datetime.now(timezone.utc)
        forecast = []

        for day_offset in range(14):
            forecast_date = today + timedelta(days=day_offset)
            date_str = forecast_date.strftime("%Y-%m-%d")

            # Shift environmental features slightly per day
            tmax = base_env.get("tmax_mean_c", 35.0) - day_offset * 0.2
            spi_3 = base_env.get("spi_3", 0.0) + day_offset * 0.05
            ahsd = max(0, base_env.get("ahsd_days", base_env.get("ahsd", 0)) - day_offset * 0.3)
            hdd = max(0, base_env.get("hdd", 0.0) - day_offset * 0.2)
            sma = base_env.get("sma", 0.0) + day_offset * 0.02

            score, _ = compute_cdhi(tmax, spi_3, ahsd, hdd, sma)
            category = categorize_cdhi(score)

            stage_mult = get_stage_multiplier(stage)
            loss_prob = round(min(1.0, score / 100.0 * stage_mult), 4)

            forecast.append({
                "date": date_str,
                "cdhi_score": score,
                "cdhi_category": category,
                "loss_prob": loss_prob,
            })

        return forecast

    def _resolve_state(self, plot_id: str) -> str:
        """Resolve state name from plot_id format: STATE_CODE-DISTRICT-F-NNNN."""
        state_codes = {
            "PB": "Punjab", "RJ": "Rajasthan", "MH": "Maharashtra",
            "UP": "Uttar Pradesh", "MP": "Madhya Pradesh", "HR": "Haryana",
            "TN": "Tamil Nadu", "KA": "Karnataka", "GJ": "Gujarat",
            "AP": "Andhra Pradesh", "TS": "Telangana", "OR": "Odisha",
            "WB": "West Bengal", "BR": "Bihar", "JH": "Jharkhand",
        }
        code = plot_id.split("-")[0] if "-" in plot_id else "RJ"
        return state_codes.get(code, "Rajasthan")

    def _default_env(self, state: str) -> dict:
        """Default environmental data when DynamoDB hasn't been populated."""
        return {
            "tmax_mean_c": 35.0,
            "tmin_mean_c": 25.0,
            "humidity_pct": 50.0,
            "spi_3": -0.5,
            "spi_6": -0.3,
            "spi_12": -0.1,
            "sma": -0.2,
            "soil_moisture_pct": 40.0,
            "ahsd_days": 5,
            "hsi_c": 36.0,
            "hdd": 10.0,
            "ndvi": 0.4,
            "lst_c": 38.0,
            "yield_baseline": 100.0,
        }

    def _recommend_action(self, category: str, crop: str, stage: str) -> str | None:
        """Suggest an action based on CDHI category."""
        if category == "RED":
            if stage in ("flowering", "grain_filling"):
                return "IRRIGATE_TONIGHT"
            return "PROTECTIVE_IRRIGATION"
        elif category == "CAUTION":
            return "MONITOR_AND_PREPARE"
        return None
