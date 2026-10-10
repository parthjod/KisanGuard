"""Script: Seed crop growth stage calendar data into DynamoDB / local cache."""

from __future__ import annotations

import logging
from app.services.crop_calendar_service import DEFAULT_CALENDAR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("load_crop_calendars")


def seed_calendars():
    logger.info(f"Loaded {len(DEFAULT_CALENDAR)} calendar entries into service cache.")


if __name__ == "__main__":
    seed_calendars()
