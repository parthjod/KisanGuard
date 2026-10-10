"""Script: Load ward geospatial coordinates into DynamoDB and local JSON store."""

from __future__ import annotations

import json
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("load_ward_geo")

SAMPLE_WARDS = {
    "RJ-JD-042": {
        "ward_id": "RJ-JD-042",
        "name": "Mandore Ward 42",
        "district": "Jodhpur",
        "state": "Rajasthan",
        "lat": 26.35,
        "lon": 73.04,
        "population": 12400,
    },
    "RJ-JD-043": {
        "ward_id": "RJ-JD-043",
        "name": "Mandore Ward 43",
        "district": "Jodhpur",
        "state": "Rajasthan",
        "lat": 26.36,
        "lon": 73.05,
        "population": 9800,
    },
    "PB-LD-015": {
        "ward_id": "PB-LD-015",
        "name": "Gill Road Ward 15",
        "district": "Ludhiana",
        "state": "Punjab",
        "lat": 30.90,
        "lon": 75.85,
        "population": 18200,
    },
}


def load_ward_geo():
    out_dir = Path("app/data")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "ward_lookup.json"

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(SAMPLE_WARDS, f, indent=2)

    logger.info(f"Loaded {len(SAMPLE_WARDS)} wards into {out_file}")


if __name__ == "__main__":
    load_ward_geo()
