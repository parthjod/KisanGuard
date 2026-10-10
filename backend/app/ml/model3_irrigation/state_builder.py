"""Build RL state vector from soil moisture + CDHI + crop stage."""

from __future__ import annotations

import numpy as np

STAGE_ENCODINGS: dict[str, int] = {
    "initial": 0,
    "vegetative": 1,
    "development": 1,
    "flowering": 2,
    "reproductive": 2,
    "mid-season": 2,
    "late": 3,
    "late-season": 3,
    "maturity": 3,
    "harvest": 3,
}


def encode_crop_stage(stage: str | None) -> int:
    """Encode crop stage name string to integer 0-3."""
    if not stage:
        return 0
    return STAGE_ENCODINGS.get(str(stage).lower().strip(), 0)


def build_rl_state(
    soil_moisture_pct: float,
    crop_stage_enc: int,
    cdhi_score: float,
    water_available_m3: float,
    obs_dim: int = 28,
    extra_features: dict | None = None,
) -> np.ndarray:
    """
    Build the RL observation vector for PPO inference.
    Pads to obs_dim dimensions.

    Core features (first 4):
      [0] soil_moisture_pct (normalized 0-1)
      [1] crop_stage_enc (int → float)
      [2] cdhi_score (normalized 0-1)
      [3] water_available_m3 (normalized)

    Remaining dimensions filled with extra features or zeros.
    """
    # Normalize
    sm_norm = max(0.0, min(1.0, soil_moisture_pct / 100.0))
    cdhi_norm = max(0.0, min(1.0, cdhi_score / 100.0))
    water_norm = max(0.0, min(1.0, water_available_m3 / 500.0))  # assume max 500 m³
    stage_norm = crop_stage_enc / 4.0  # 4 stages

    # Core features
    state = [sm_norm, stage_norm, cdhi_norm, water_norm]

    # Extra features from environment
    if extra_features:
        extra_keys = [
            "tmax_c", "tmin_c", "humidity_pct", "wind_ms",
            "spi_3", "spi_6", "sma", "ahsd", "hdd",
            "ndvi", "lst_c", "rainfall_mm",
            "spi_12", "hsi", "elevation",
        ]
        for key in extra_keys:
            if len(state) >= obs_dim:
                break
            val = extra_features.get(key, 0.0)
            state.append(float(val) if val is not None else 0.0)

    # Pad to obs_dim
    while len(state) < obs_dim:
        state.append(0.0)

    return np.array(state[:obs_dim], dtype=np.float32)
