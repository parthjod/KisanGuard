"""MAD (Management Allowable Depletion) threshold integration (FR-15)."""

from __future__ import annotations


# MAD thresholds: % soil moisture below which irrigation is critical
MAD_THRESHOLDS: dict[str, float] = {
    "wheat": 35.0,
    "rice": 55.0,
    "maize": 40.0,
    "sorghum": 30.0,
    "millet": 25.0,
}


def check_mad_critical(soil_moisture_pct: float, crop: str) -> bool:
    """
    Check if soil moisture is below MAD threshold for this crop.
    Returns True if irrigation is critical.
    """
    threshold = MAD_THRESHOLDS.get(crop, 35.0)
    return soil_moisture_pct < threshold


def get_mad_threshold(crop: str) -> float:
    """Get the MAD threshold for a crop."""
    return MAD_THRESHOLDS.get(crop, 35.0)


def compute_deficit(soil_moisture_pct: float, crop: str) -> float:
    """
    Compute soil moisture deficit below MAD threshold.
    Returns positive value if in deficit, 0.0 if adequate.
    """
    threshold = MAD_THRESHOLDS.get(crop, 35.0)
    return max(0.0, threshold - soil_moisture_pct)


def check_mad_override(
    soil_moisture_pct: float,
    crop: str,
    ppo_action: str,
) -> tuple[str, bool]:
    """
    Safety override: if MAD critical AND PPO says WAIT → override to IRRIGATE.

    Returns (final_action, was_overridden).
    """
    is_critical = check_mad_critical(soil_moisture_pct, crop)

    if is_critical and ppo_action == "WAIT":
        return "IRRIGATE", True

    return ppo_action, False
