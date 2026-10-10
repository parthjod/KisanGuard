"""Feature 1: WBGT + PSI full pipeline service."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
from boto3.dynamodb.conditions import Key

from app.config import settings
from app.db import dynamo, s3 as s3_db
from app.db.timestream import write_wbgt_records
from app.ml.model1_wbgt.ensemble import ensemble_predict
from app.ml.model1_wbgt.feature_builder import build_wbgt_features, compute_missing_pct
from app.ml.model1_wbgt.postprocess import (
    METABOLIC_RATES,
    classify_severity,
    compute_psi,
    compute_wbgt,
    estimate_component_temps,
    get_rest_minutes,
    get_water_litres,
    is_safe_to_work,
)
from app.utils.geo import lookup_ward

logger = logging.getLogger(__name__)

# IST offset
IST = timezone(timedelta(hours=5, minutes=30))


class WBGTService:
    """
    PRD FR-1: Ward-level WBGT forecasts, hourly, 1 km resolution.
    PRD FR-2: PSI from WBGT + metabolic rate + clothing insulation.
    PRD FR-3: Severity classification LOW/MODERATE/HIGH.
    PRD FR-4: PSI-adjusted advice per work intensity.
    """

    def __init__(self, model_bundle: Any = None):
        self.model = model_bundle

    async def get_forecast(
        self,
        ward_id: str,
        date: str,
        hours: int = 24,
        lang: str = "hi",
        work_intensity: str = "MODERATE",
    ) -> dict:
        """Full pipeline: features → ensemble → PSI → severity → advisory → cache."""
        start_time = time.time()

        # 1. Ward lookup
        ward = lookup_ward(ward_id)
        if not ward:
            from app.utils.errors import WardNotFoundError
            raise WardNotFoundError(ward_id)

        # 2. Check S3 cache
        cache_key = f"features/wbgt/{ward_id}/{date}.json"
        cached = await s3_db.check_cache(cache_key, settings.S3_FEATURE_CACHE_TTL_MINUTES)
        if cached:
            logger.info("wbgt_cache_hit", ward_id=ward_id, date=date)
            return cached

        # 3. Fetch features from DynamoDB
        features_data = await dynamo.get_item(
            settings.DYNAMO_FEATURES_TABLE,
            {"PK": ward_id, "SK": date},
        )

        # Default features if not yet ingested
        if not features_data:
            features_data = self._default_features(ward, date)

        # 4–9. Build hourly predictions
        hourly = []
        parse_date = datetime.fromisoformat(date)
        day_of_year = parse_date.timetuple().tm_yday
        met = METABOLIC_RATES.get(work_intensity, 234)

        for h in range(min(hours, 48)):
            hour_utc = parse_date + timedelta(hours=h)
            hour_ist = hour_utc + timedelta(hours=5, minutes=30)

            # Build feature vector
            raw_data = self._hourly_features(features_data, h)
            feature_cols = self.model.feature_cols if self.model else []

            if self.model and feature_cols:
                features = build_wbgt_features(raw_data, feature_cols, h % 24, day_of_year)
                missing_pct = compute_missing_pct(raw_data, feature_cols)

                # Run ensemble
                wbgt_pred, confidence = ensemble_predict(
                    self.model.xgb_model,
                    self.model.lstm_model,
                    features,
                    None,  # sequence not available for all hours
                    self.model.preprocessor,
                    self.model.xgb_weight,
                    self.model.lstm_weight,
                    self.model.sequence_length,
                )
            else:
                # Fallback: estimate from temperature
                ta = raw_data.get("air_temp_c", 35.0)
                humidity = raw_data.get("rel_humidity_pct", 50.0)
                wbgt_pred = ta * 0.567 + humidity * 0.067 + 3.94
                wbgt_pred = round(wbgt_pred, 2)
                confidence = 0.75
                missing_pct = 0.0

            # Estimate component temperatures
            ta = raw_data.get("air_temp_c", 35.0)
            humidity = raw_data.get("rel_humidity_pct", 50.0)
            ta_c, tnw_c, tg_c = estimate_component_temps(wbgt_pred, ta, humidity)

            # PSI and severity
            psi = compute_psi(wbgt_pred, met)
            severity = classify_severity(wbgt_pred)

            hourly.append({
                "hour_utc": hour_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "hour_ist": hour_ist.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
                "wbgt_c": wbgt_pred,
                "ta_c": ta_c,
                "tnw_c": tnw_c,
                "tg_c": tg_c,
                "humidity_pct": humidity,
                "psi": psi,
                "severity": severity,
                "safe_to_work": is_safe_to_work(severity, work_intensity),
                "rest_minutes_per_hour": get_rest_minutes(severity, work_intensity),
                "water_litres_per_hour": get_water_litres(severity, work_intensity),
                "advisory": "",  # filled by bedrock_service later
            })

        # Build daily summary
        peak_idx = max(range(len(hourly)), key=lambda i: hourly[i]["wbgt_c"])
        peak = hourly[peak_idx]

        # Safe work windows (WBGT < 31)
        safe_windows = self._compute_safe_windows(hourly)
        # Mandatory rest hours (WBGT >= 33)
        rest_hours = self._compute_rest_hours(hourly)

        overall_confidence = min(h["wbgt_c"] for h in hourly) if hourly else 0.85
        overall_confidence = confidence  # use latest prediction confidence

        data_freshness = (datetime.now(timezone.utc) - parse_date.replace(tzinfo=timezone.utc)).total_seconds() / 60

        model_version = self.model.metadata.get("version", "wbgt-v1.0") if self.model else "wbgt-v1.0"

        result = {
            "ward_id": ward_id,
            "district": ward.get("district", ""),
            "state": ward.get("state", ""),
            "date": date,
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "model_version": model_version,
            "data_freshness_minutes": round(abs(data_freshness), 1),
            "confidence": round(confidence, 4),
            "a2i_flagged": False,
            "a2i_decision": None,
            "hourly": hourly,
            "daily_summary": {
                "peak_wbgt_c": peak["wbgt_c"],
                "peak_hour_ist": peak["hour_ist"],
                "severity": classify_severity(peak["wbgt_c"]),
                "safe_work_windows_ist": safe_windows,
                "mandatory_rest_hours_ist": rest_hours,
                "advisory": "",
            },
        }

        # 14. Cache result to S3
        try:
            await s3_db.put_json(cache_key, result)
        except Exception as e:
            logger.warning("wbgt_cache_write_failed", error=str(e))

        # 15. Write to Timestream
        try:
            await write_wbgt_records(ward_id, hourly)
        except Exception as e:
            logger.warning("wbgt_timestream_write_failed", error=str(e))

        latency_ms = (time.time() - start_time) * 1000
        logger.info(
            "wbgt_forecast_complete",
            ward_id=ward_id,
            date=date,
            hours=len(hourly),
            peak_wbgt=peak["wbgt_c"],
            confidence=confidence,
            latency_ms=round(latency_ms, 1),
        )

        return result

    def _hourly_features(self, features_data: dict, hour: int) -> dict:
        """Extract features for a specific hour from daily features."""
        # Base features from daily aggregate
        result = {
            "air_temp_c": features_data.get("tmax_mean_c", 35.0),
            "rel_humidity_pct": features_data.get("humidity_pct", 50.0),
            "wind_ms": features_data.get("wind_ms", 2.0),
            "pressure_hpa": 1013.0,
            "solar_w_m2": 0.0,
            "lst": features_data.get("lst_c"),
            "ndvi": features_data.get("ndvi"),
            "elevation": features_data.get("elevation_m", 200),
        }

        # Apply diurnal temperature cycle
        import math
        hour_local = (hour + 5) % 24  # approximate IST
        temp_factor = math.sin(math.pi * (hour_local - 6) / 12) if 6 <= hour_local <= 18 else -0.3
        tmax = features_data.get("tmax_mean_c", 35.0)
        tmin = features_data.get("tmin_mean_c", tmax - 10)
        result["air_temp_c"] = round(tmin + (tmax - tmin) * max(0, temp_factor), 2)

        # Solar radiation follows similar pattern
        if 6 <= hour_local <= 18:
            result["solar_w_m2"] = round(800 * max(0, temp_factor), 1)

        # Fill lag features with current values
        for base in ["air_temp_c", "rel_humidity_pct", "wind_ms", "pressure_hpa", "solar_w_m2", "lst", "ndvi"]:
            for lag in [1, 3, 6, 24]:
                result[f"{base}_lag_{lag}"] = result.get(base, 0.0)

        # WBGT lags
        for lag in [1, 3, 6, 24]:
            result[f"wbgt_lag_{lag}"] = 30.0  # placeholder

        return result

    def _default_features(self, ward: dict, date: str) -> dict:
        """Default feature values when data hasn't been ingested yet."""
        return {
            "tmax_mean_c": 35.0,
            "tmin_mean_c": 25.0,
            "humidity_pct": 50.0,
            "wind_ms": 2.0,
            "lst_c": None,
            "ndvi": None,
            "elevation_m": ward.get("elevation_m", 200),
        }

    def _compute_safe_windows(self, hourly: list[dict]) -> list[str]:
        """Find IST hour ranges where WBGT < 31 (safe for all work)."""
        windows = []
        in_safe = False
        start_h = ""

        for h in hourly:
            ist_hour = h["hour_ist"][:16]  # HH:MM
            parts = ist_hour.split("T")[1][:5] if "T" in ist_hour else "00:00"

            if h["wbgt_c"] < 31.0:
                if not in_safe:
                    start_h = parts
                    in_safe = True
            else:
                if in_safe:
                    windows.append(f"{start_h}–{parts}")
                    in_safe = False

        if in_safe:
            windows.append(f"{start_h}–23:59")

        return windows if windows else ["06:00–10:00", "17:00–19:00"]

    def _compute_rest_hours(self, hourly: list[dict]) -> list[str]:
        """Find IST hour ranges where WBGT >= 33 (mandatory rest)."""
        rest = []
        in_rest = False
        start_h = ""

        for h in hourly:
            ist_hour = h["hour_ist"]
            parts = ist_hour.split("T")[1][:5] if "T" in ist_hour else "00:00"

            if h["wbgt_c"] >= 33.0:
                if not in_rest:
                    start_h = parts
                    in_rest = True
            else:
                if in_rest:
                    rest.append(f"{start_h}–{parts}")
                    in_rest = False

        if in_rest:
            rest.append(f"{start_h}–18:00")

        return rest if rest else []
