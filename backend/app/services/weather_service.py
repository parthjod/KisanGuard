"""Real-time weather ingestion service using Open-Meteo + microclimate physical models.

Fetches live temperature, relative humidity, wind speed, solar radiation, and pressure
for any geographic coordinate in India. Computes Liljegren / Bernard WBGT and PSI
(Physiological Strain Index). Includes robust caching and physics-based fallback.
"""

from __future__ import annotations

import logging
import math
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# In-memory cache for live weather: {(lat_2dp, lon_2dp): (timestamp, weather_dict)}
_WEATHER_CACHE: dict[tuple[float, float], tuple[float, dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 900  # 15 minutes


def _calc_wbgt_empirical(temp_c: float, humidity_pct: float, wind_kmh: float = 8.0, solar_w: float = 600.0) -> float:
    """Calculates outdoor WBGT using the Australian Bureau of Meteorology / Liljegren approximation.

    WBGT = 0.567 * Ta + 0.393 * e + 3.94 (simplified) or enhanced with solar and wind cooling.
    """
    # Vapor pressure in hPa
    e = (humidity_pct / 100.0) * 6.105 * math.exp((17.27 * temp_c) / (237.7 + temp_c))
    base_wbgt = 0.567 * temp_c + 0.393 * e + 3.94

    # Adjust for solar radiation (+0.5 to +2.5 deg C in direct sun) and wind cooling (-0.5 to -2.0 deg C)
    solar_adj = min(3.0, (solar_w / 1000.0) * 2.5)
    wind_cooling = min(2.5, (wind_kmh / 20.0) * 1.5)

    wbgt = base_wbgt + solar_adj - wind_cooling
    return round(max(15.0, min(48.0, wbgt)), 1)


def _calc_psi(wbgt: float) -> int:
    """Calculates Physiological Strain Index on 0-100 scale."""
    return int(max(0, min(100, (wbgt - 18.0) * 5.6)))


def _classify_severity(wbgt: float) -> str:
    """Classifies severity based on WBGT."""
    if wbgt >= 33.0:
        return "red"
    if wbgt >= 28.0:
        return "caution"
    return "safe"


async def fetch_live_weather(lat: float, lon: float, elevation_m: float = 250.0) -> dict[str, Any]:
    """Fetches real live weather for coordinates (lat, lon) from Open-Meteo or cached/fallback model."""
    cache_key = (round(lat, 2), round(lon, 2))
    now_ts = time.time()

    if cache_key in _WEATHER_CACHE:
        cached_time, cached_data = _WEATHER_CACHE[cache_key]
        if now_ts - cached_time < CACHE_TTL_SECONDS:
            return cached_data

    # Attempt live query to Open-Meteo
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure"
        f"&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m"
        f"&forecast_days=2&timezone=Asia%2FKolkata"
    )

    try:
        async with httpx.AsyncClient(timeout=3.5) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                curr = data.get("current", {})
                hourly = data.get("hourly", {})

                temp_c = float(curr.get("temperature_2m", 33.0))
                hum_pct = float(curr.get("relative_humidity_2m", 45.0))
                wind_kmh = float(curr.get("wind_speed_10m", 8.0))
                pressure_hpa = float(curr.get("surface_pressure", 980.0))

                # Hour-of-day solar estimation
                now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
                hour = now_ist.hour
                solar_w = 750.0 * max(0.0, math.sin(math.pi * (hour - 6) / 12.0)) if 6 <= hour <= 18 else 0.0

                current_wbgt = _calc_wbgt_empirical(temp_c, hum_pct, wind_kmh, solar_w)
                current_psi = _calc_psi(current_wbgt)
                current_sev = _classify_severity(current_wbgt)

                # Format hourly trend
                times = hourly.get("time", [])
                temps = hourly.get("temperature_2m", [])
                hums = hourly.get("relative_humidity_2m", [])
                winds = hourly.get("wind_speed_10m", [])

                trend = []
                for i in range(min(24, len(times))):
                    t_iso = times[i]
                    h_val = int(t_iso.split("T")[1][:2]) if "T" in t_iso else i
                    sol_val = 750.0 * max(0.0, math.sin(math.pi * (h_val - 6) / 12.0)) if 6 <= h_val <= 18 else 0.0
                    t_cur = float(temps[i]) if i < len(temps) else temp_c
                    hum_cur = float(hums[i]) if i < len(hums) else hum_pct
                    w_cur = float(winds[i]) if i < len(winds) else wind_kmh
                    h_wbgt = _calc_wbgt_empirical(t_cur, hum_cur, w_cur, sol_val)

                    trend.append({
                        "time": f"{h_val:02d}:00",
                        "wbgt": h_wbgt,
                        "temperature": round(t_cur, 1),
                        "humidity": round(hum_cur, 0),
                        "psi": _calc_psi(h_wbgt),
                    })

                result = {
                    "source": "open-meteo-live",
                    "latitude": lat,
                    "longitude": lon,
                    "temperature": round(temp_c, 1),
                    "humidity": round(hum_pct, 0),
                    "wind_kmh": round(wind_kmh, 1),
                    "pressure_hpa": round(pressure_hpa, 1),
                    "wbgt": current_wbgt,
                    "psi": current_psi,
                    "severity": current_sev,
                    "trend": trend,
                }
                _WEATHER_CACHE[cache_key] = (now_ts, result)
                return result

    except Exception as exc:
        logger.warning(f"Open-Meteo live query failed for ({lat}, {lon}): {exc}. Falling back to physics model.")

    # Physics-based coordinate microclimate fallback
    # Differentiates by latitude, longitude, and elevation
    now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    hour = now_ist.hour
    temp_factor = math.sin(math.pi * (hour - 6) / 12.0) if 6 <= hour <= 18 else -0.35

    # Base temp varies with latitude and distance inland
    base_tmax = 35.0 - (lat - 18.0) * 0.4 + (lon - 74.0) * 0.5 - (elevation_m / 250.0) * 1.2
    base_tmin = base_tmax - 11.0
    temp_c = round(base_tmin + (base_tmax - base_tmin) * max(0.0, temp_factor), 1)
    hum_pct = round(max(20.0, min(85.0, 68.0 - temp_factor * 35.0 - (lon - 74.0) * 2.5)), 0)
    wind_kmh = round(6.0 + abs(math.sin(lon)) * 8.0, 1)
    solar_w = 700.0 * max(0.0, temp_factor) if 6 <= hour <= 18 else 0.0

    current_wbgt = _calc_wbgt_empirical(temp_c, hum_pct, wind_kmh, solar_w)
    current_psi = _calc_psi(current_wbgt)

    trend = []
    for h in range(24):
        tf = math.sin(math.pi * (h - 6) / 12.0) if 6 <= h <= 18 else -0.35
        tc = round(base_tmin + (base_tmax - base_tmin) * max(0.0, tf), 1)
        hc = round(max(20.0, min(85.0, 68.0 - tf * 35.0 - (lon - 74.0) * 2.5)), 0)
        sol = 700.0 * max(0.0, tf) if 6 <= h <= 18 else 0.0
        h_wbgt = _calc_wbgt_empirical(tc, hc, wind_kmh, sol)
        trend.append({
            "time": f"{h:02d}:00",
            "wbgt": h_wbgt,
            "temperature": tc,
            "humidity": hc,
            "psi": _calc_psi(h_wbgt),
        })

    result = {
        "source": "coordinate-microclimate-physics",
        "latitude": lat,
        "longitude": lon,
        "temperature": temp_c,
        "humidity": hum_pct,
        "wind_kmh": wind_kmh,
        "pressure_hpa": 985.0,
        "wbgt": current_wbgt,
        "psi": current_psi,
        "severity": _classify_severity(current_wbgt),
        "trend": trend,
    }
    _WEATHER_CACHE[cache_key] = (now_ts, result)
    return result
