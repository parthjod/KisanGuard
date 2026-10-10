"""Build exact feature vector matching wbgt_feature_cols.json."""

from __future__ import annotations

import math
from datetime import datetime
from typing import Any

import numpy as np


def build_wbgt_features(
    raw_data: dict[str, Any],
    feature_cols: list[str],
    hour: int,
    day_of_year: int,
) -> np.ndarray:
    """
    Build the feature vector for a single hour's WBGT prediction.
    Column order MUST match wbgt_feature_cols.json exactly.

    raw_data should contain keys like:
        air_temp_c, rel_humidity_pct, wind_ms, pressure_hpa,
        solar_w_m2, lst, ndvi, elevation,
        and lag variants: *_lag_1, *_lag_3, *_lag_6, *_lag_24,
        wbgt_lag_1, wbgt_lag_3, wbgt_lag_6, wbgt_lag_24
    """
    # Compute cyclical time features
    hour_sin = math.sin(2 * math.pi * hour / 24)
    hour_cos = math.cos(2 * math.pi * hour / 24)
    doy_sin = math.sin(2 * math.pi * day_of_year / 365)
    doy_cos = math.cos(2 * math.pi * day_of_year / 365)

    # Build computed values
    computed = {
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "doy_sin": doy_sin,
        "doy_cos": doy_cos,
        "lst_missing": 1.0 if raw_data.get("lst") is None else 0.0,
        "ndvi_missing": 1.0 if raw_data.get("ndvi") is None else 0.0,
    }

    # Merge raw data with computed
    all_data = {**raw_data, **computed}

    # Fill missing with defaults
    defaults = {
        "lst": 0.0,
        "ndvi": 0.0,
        "elevation": 0.0,
    }
    for key, default in defaults.items():
        if all_data.get(key) is None:
            all_data[key] = default

    # Also fill lag defaults
    for col in feature_cols:
        if col not in all_data:
            # For lag features, use current value or 0
            base_name = col.rsplit("_lag_", 1)[0] if "_lag_" in col else col
            all_data[col] = all_data.get(base_name, 0.0)

    # Build feature vector in exact column order
    features = []
    for col in feature_cols:
        val = all_data.get(col, 0.0)
        features.append(float(val) if val is not None else 0.0)

    return np.array(features, dtype=np.float32)


def compute_missing_pct(raw_data: dict, feature_cols: list[str]) -> float:
    """Calculate percentage of missing features."""
    missing = sum(1 for col in feature_cols if raw_data.get(col) is None)
    return missing / len(feature_cols) if feature_cols else 0.0
