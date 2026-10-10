"""
CDHI index formula — must match Model 2 training notebook exactly.

Compound Drought–Heat Index computes a normalized 0–100 score from:
  - heat_norm: normalized maximum temperature
  - drought_norm: normalized SPI-3 (inverted, drought = negative SPI)
  - ahsd_norm: normalized accumulated heat stress days
  - hdd_norm: normalized heating degree days
  - sma_norm: normalized soil moisture anomaly (inverted)
"""

from __future__ import annotations


def compute_cdhi(
    tmax_mean: float,
    spi_3: float,
    ahsd: float,
    hdd: float,
    sma: float,
) -> tuple[float, dict]:
    """
    Compute the Compound Drought–Heat Index.

    Returns:
        (score, components) where score is 0–100 and components is a dict
        of normalized values for each input.

    Weights (PRD §10):
        heat: 0.35, drought: 0.25, ahsd: 0.20, hdd: 0.10, sma: 0.10
    """
    heat_norm = min(max((tmax_mean - 20) / 30, 0.0), 1.0)
    drought_norm = min(max(-spi_3 / 3, 0.0), 1.0)
    ahsd_norm = min(max(ahsd / 20, 0.0), 1.0)
    hdd_norm = min(max(hdd / 15, 0.0), 1.0)
    sma_norm = min(max(-sma, 0.0), 1.0)

    raw = (
        0.35 * heat_norm
        + 0.25 * drought_norm
        + 0.20 * ahsd_norm
        + 0.10 * hdd_norm
        + 0.10 * sma_norm
    )
    score = min(max(raw * 100, 0.0), 100.0)

    components = {
        "heat_norm": round(heat_norm, 4),
        "drought_norm": round(drought_norm, 4),
        "ahsd_norm": round(ahsd_norm, 4),
        "hdd_norm": round(hdd_norm, 4),
        "sma_norm": round(sma_norm, 4),
    }

    return round(score, 2), components


def categorize_cdhi(score: float) -> str:
    """
    Categorize CDHI score:
      SAFE:    < 30
      CAUTION: 30 – 59.99
      RED:     ≥ 60
    """
    if score < 30:
        return "SAFE"
    if score < 60:
        return "CAUTION"
    return "RED"


# ── Crop thresholds (PRD Table 7.2) ─────────────────────────────────────

CROP_CONFIG: dict[str, dict] = {
    "wheat": {
        "heat_threshold_c": 30,
        "drought_sensitivity": "HIGH",
        "critical_stage": "grain_filling",
    },
    "rice": {
        "heat_threshold_c": 35,
        "drought_sensitivity": "VERY_HIGH",
        "critical_stage": "flowering",
    },
    "maize": {
        "heat_threshold_c": 35,
        "drought_sensitivity": "HIGH",
        "critical_stage": "grain_filling",
    },
    "sorghum": {
        "heat_threshold_c": 38,
        "drought_sensitivity": "MEDIUM",
        "critical_stage": "grain_filling",
    },
    "millet": {
        "heat_threshold_c": 40,
        "drought_sensitivity": "LOW",
        "critical_stage": "grain_filling",
    },
}

STAGE_MULTIPLIERS: dict[str, float] = {
    "vegetative": 0.40,
    "flowering": 1.00,
    "grain_filling": 0.90,
    "maturity": 0.25,
}


def get_stage_multiplier(stage: str) -> float:
    """Return yield risk multiplier for crop growth stage."""
    return STAGE_MULTIPLIERS.get(stage, 0.90)  # default to grain_filling if unknown
