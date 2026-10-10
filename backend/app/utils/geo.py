"""Ward ID → lat/lon/district/state lookup (in-memory LRU)."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)

# Loaded once at startup from S3 or local file — ~500 KB for 5,247 wards
_ward_cache: dict[str, dict[str, Any]] = {}


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
    """Look up ward metadata by ward_id. Returns None if not found."""
    return _ward_cache.get(ward_id)


def get_all_ward_ids() -> list[str]:
    """Return all loaded ward IDs."""
    return list(_ward_cache.keys())


def ward_exists(ward_id: str) -> bool:
    """Check if ward exists in cache."""
    return ward_id in _ward_cache


def _get_sample_wards() -> dict[str, dict]:
    """Sample wards for local dev / testing."""
    return {
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
