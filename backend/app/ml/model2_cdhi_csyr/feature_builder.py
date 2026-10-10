"""Build exact feature vector matching feature_cols.json for Model 2."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


def build_cdhi_features(
    env_data: dict[str, Any],
    crop: str,
    stage: str,
    season: str,
    label_encoders: dict,
    feature_cols: list[str],
    cdhi_score: float,
) -> np.ndarray:
    """
    Build the feature vector for Model 2 inference.
    Column order MUST match feature_cols.json exactly.

    feature_cols.json contains:
    ["spi_3", "spi_6", "spi_12", "sma", "ahsd", "hsi", "hdd",
     "cdhi", "yield_baseline", "crop_type_enc", "crop_stage_enc", "season_enc"]
    """
    # Encode categorical features using label encoders
    crop_enc = _safe_encode(label_encoders, "crop", crop)
    stage_enc = _safe_encode(label_encoders, "stage", stage)
    season_enc = _safe_encode_season(label_encoders, season)

    # Build the data dict
    data = {
        "spi_3": env_data.get("spi_3", 0.0),
        "spi_6": env_data.get("spi_6", 0.0),
        "spi_12": env_data.get("spi_12", 0.0),
        "sma": env_data.get("sma", 0.0),
        "ahsd": env_data.get("ahsd_days", env_data.get("ahsd", 0)),
        "hsi": env_data.get("hsi_c", env_data.get("hsi", 0.0)),
        "hdd": env_data.get("hdd", 0.0),
        "cdhi": cdhi_score,
        "yield_baseline": env_data.get("yield_baseline", 100.0),
        "crop_type_enc": crop_enc,
        "crop_stage_enc": stage_enc,
        "season_enc": season_enc,
    }

    # Build feature vector in exact column order
    features = []
    for col in feature_cols:
        val = data.get(col, 0.0)
        features.append(float(val) if val is not None else 0.0)

    return np.array(features, dtype=np.float32)


def _safe_encode(encoders: dict, key: str, value: str) -> int:
    """Safely encode a categorical value. Falls back to 0 if unknown."""
    try:
        encoder = encoders.get(key)
        if encoder is None:
            # Try alternate key names
            alt_keys = {
                "crop": ["crop_type", "crop"],
                "stage": ["crop_stage", "stage"],
                "state": ["state"],
            }
            for alt in alt_keys.get(key, []):
                encoder = encoders.get(alt)
                if encoder is not None:
                    break

        if encoder is not None:
            if hasattr(encoder, "transform"):
                return int(encoder.transform([value])[0])
            elif hasattr(encoder, "classes_"):
                classes = list(encoder.classes_)
                if value in classes:
                    return classes.index(value)
        return 0
    except Exception as e:
        logger.warning("label_encode_failed", key=key, value=value, error=str(e))
        return 0


def _safe_encode_season(encoders: dict, season: str) -> int:
    """Encode season. Maps kharif=0, rabi=1, annual=2 if no encoder."""
    encoder = encoders.get("season") or encoders.get("season_enc")
    if encoder is not None:
        try:
            if hasattr(encoder, "transform"):
                return int(encoder.transform([season])[0])
        except Exception:
            pass

    # Fallback mapping
    mapping = {"kharif": 0, "rabi": 1, "annual": 2}
    return mapping.get(season, 0)
