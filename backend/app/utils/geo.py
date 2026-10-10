"""Ward ID → lat/lon/district/state lookup (in-memory LRU)."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)

# Loaded once at startup from S3 or local file — ~500 KB for 5,247 wards
_ward_cache: dict[str, dict[str, Any]] = {}


def load_ward_data() -> None:
    """Load ward geo data synchronously for startup warmup."""
    global _ward_cache
    if not _ward_cache:
        _ward_cache.update(_get_sample_wards())


async def load_ward_geo(s3_client: Any = None, bucket: str = "", key: str = "geo/ward_lookup.json") -> None:
    """Load ward geo data into in-memory cache. Called at startup."""
    global _ward_cache
    if s3_client:
        try:
            resp = await s3_client.get_object(Bucket=bucket, Key=key)
            body = await resp["Body"].read()
            _ward_cache.update(json.loads(body))
            logger.info("ward_geo_loaded", ward_count=len(_ward_cache))
            return
        except Exception as e:
            logger.warning("ward_geo_s3_fallback", error=str(e))

    # Fallback: seed with a few sample wards for local dev
    _ward_cache.update(_get_sample_wards())
    logger.info("ward_geo_loaded_sample", ward_count=len(_ward_cache))


def lookup_ward(ward_id: str) -> dict | None:
    """Look up ward metadata by ward_id. Case-insensitive."""
    if not ward_id:
        return None
    res = _ward_cache.get(ward_id)
    if res:
        return res
    res = _ward_cache.get(ward_id.lower())
    if res:
        return res
    res = _ward_cache.get(ward_id.upper())
    if res:
        return res
    for k, v in _ward_cache.items():
        if k.lower() == ward_id.lower() or v.get("district", "").lower() == ward_id.lower():
            return v
    return None


def get_all_ward_ids() -> list[str]:
    """Return all loaded ward IDs."""
    return list(_ward_cache.keys())


def ward_exists(ward_id: str) -> bool:
    """Check if ward exists in cache."""
    return lookup_ward(ward_id) is not None


def _get_sample_wards() -> dict[str, dict]:
    """Sample wards for local dev / testing."""
    return {
        "nashik": {
            "lat": 19.95,
            "lon": 73.72,
            "district": "Nashik",
            "state": "Maharashtra",
            "population": 15000,
            "elevation_m": 580,
        },
        "latur": {
            "lat": 18.40,
            "lon": 76.58,
            "district": "Latur",
            "state": "Maharashtra",
            "population": 12000,
            "elevation_m": 630,
        },
        "sangli": {
            "lat": 16.87,
            "lon": 74.68,
            "district": "Sangli",
            "state": "Maharashtra",
            "population": 14000,
            "elevation_m": 550,
        },
        "beed": {
            "lat": 18.25,
            "lon": 76.06,
            "district": "Beed",
            "state": "Maharashtra",
            "population": 11000,
            "elevation_m": 515,
        },
        "nanded": {
            "lat": 18.78,
            "lon": 77.26,
            "district": "Nanded",
            "state": "Maharashtra",
            "population": 13500,
            "elevation_m": 360,
        },
        "dhule": {
            "lat": 20.90,
            "lon": 74.77,
            "district": "Dhule",
            "state": "Maharashtra",
            "population": 10500,
            "elevation_m": 250,
        },
        "RJ-JD-042": {
            "lat": 26.2389,
            "lon": 73.0243,
            "district": "Jodhpur",
            "state": "Rajasthan",
            "population": 12400,
            "elevation_m": 231,
        },
        "RJ-JD-043": {
            "lat": 26.2890,
            "lon": 73.0350,
            "district": "Jodhpur",
            "state": "Rajasthan",
            "population": 8900,
            "elevation_m": 225,
        },
        "PB-LD-001": {
            "lat": 30.9010,
            "lon": 75.8573,
            "district": "Ludhiana",
            "state": "Punjab",
            "population": 15600,
            "elevation_m": 247,
        },
        "MH-PN-010": {
            "lat": 18.5204,
            "lon": 73.8567,
            "district": "Pune",
            "state": "Maharashtra",
            "population": 22100,
            "elevation_m": 560,
        },
        "TN-CH-005": {
            "lat": 13.0827,
            "lon": 80.2707,
            "district": "Chennai",
            "state": "Tamil Nadu",
            "population": 31200,
            "elevation_m": 6,
        },
    }
