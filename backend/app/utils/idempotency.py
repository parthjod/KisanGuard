"""Idempotency key management for alert sends."""

from __future__ import annotations

import hashlib
from datetime import date


def build_idempotency_key(user_id: str, alert_date: date | str, severity: str, sequence: int = 1) -> str:
    """
    Idempotency key format: "{user_id}:{date}:{severity}:{sequence}"
    Ensures duplicate alert sends are safely ignored.
    """
    d = alert_date if isinstance(alert_date, str) else alert_date.isoformat()
    return f"{user_id}:{d}:{severity}:{sequence}"


def hash_idempotency_key(key: str) -> str:
    """SHA-256 hash for DynamoDB lookup (shorter, fixed-length)."""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:32]
