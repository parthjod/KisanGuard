"""Post-processing: WBGT formula, PSI, severity classification."""

from __future__ import annotations


def compute_wbgt(ta: float, tnw: float, tg: float) -> float:
    """
    WBGT formula (ISO 7243):
    WBGT = 0.7 × Tnw + 0.2 × Tg + 0.1 × Ta

    ta:  Air temperature (°C)
    tnw: Natural wet-bulb temperature (°C)
    tg:  Globe temperature (°C)
    """
    return round(0.7 * tnw + 0.2 * tg + 0.1 * ta, 2)


def estimate_component_temps(wbgt_predicted: float, ta: float, humidity_pct: float) -> tuple[float, float, float]:
    """
    Estimate Tnw and Tg from predicted WBGT and available meteorological data.
    Used when we only have the ensemble-predicted WBGT and need components.

    Returns (ta, tnw, tg).
    """
    # Tnw estimation from humidity and temperature
    # Simplified psychrometric approximation
    tnw = ta - (1 - humidity_pct / 100) * (ta - 14.0) * 0.5

    # Tg estimation from solar + air temp
    # Globe temperature is typically 2-10°C above air temp in sun
    tg = ta + max(0, (wbgt_predicted - 0.7 * tnw - 0.1 * ta) / 0.2)

    return round(ta, 2), round(tnw, 2), round(tg, 2)


def compute_psi(wbgt: float, met: float, clo: float = 0.5) -> float:
    """
    Physiological Strain Index (Moran et al. 1998).
    Simplified estimation from WBGT + metabolic rate.

    met: Metabolic rate in W/m² (LIGHT=117, MODERATE=234, HEAVY=360)
    clo: Clothing insulation (default 0.5 for light workwear)
    """
    base_core_temp = 37.0
    core_temp = base_core_temp + (wbgt - 28) * 0.08 + (met / 1000) * 0.5
    psi = max(0.0, min(10.0, (core_temp - 36.5) * 5.0 + met / 360))
    return round(psi, 2)


def classify_severity(wbgt: float) -> str:
    """
    Classify WBGT severity:
    LOW:      < 31°C
    MODERATE: 31°C – 32.9°C
    HIGH:     ≥ 33°C
    """
    if wbgt < 31.0:
        return "LOW"
    if wbgt < 33.0:
        return "MODERATE"
    return "HIGH"


def is_safe_to_work(severity: str, intensity: str) -> bool:
    """Determine if it's safe to work given severity and work intensity."""
    if severity == "HIGH" and intensity == "HEAVY":
        return False
    if severity == "HIGH" and intensity == "MODERATE":
        return False
    return True


# Rest schedule: (severity, work_intensity) → rest_minutes_per_hour
REST_SCHEDULE: dict[tuple[str, str], int] = {
    ("LOW", "HEAVY"): 15,
    ("MODERATE", "HEAVY"): 30,
    ("HIGH", "HEAVY"): 45,
    ("MODERATE", "MODERATE"): 15,
    ("HIGH", "MODERATE"): 30,
    ("HIGH", "LIGHT"): 15,
}


def get_rest_minutes(severity: str, intensity: str) -> int:
    """Get recommended rest minutes per hour."""
    return REST_SCHEDULE.get((severity, intensity), 0)


def get_water_litres(severity: str, intensity: str) -> float:
    """Get recommended water intake per hour in litres."""
    base = 0.25
    if severity == "MODERATE":
        base = 0.5
    elif severity == "HIGH":
        base = 1.0

    if intensity == "HEAVY":
        base *= 1.5
    elif intensity == "MODERATE":
        base *= 1.2

    return round(base, 2)


# Metabolic rates (W/m²) per work intensity
METABOLIC_RATES: dict[str, int] = {
    "LIGHT": 117,
    "MODERATE": 234,
    "HEAVY": 360,
}
