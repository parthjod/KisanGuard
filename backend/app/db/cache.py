"""In-memory LRU cache + optional Redis for user profiles."""

from __future__ import annotations

from functools import lru_cache
from typing import Any


@lru_cache(maxsize=8192)
def get_cached_ward(ward_id: str) -> dict | None:
    """LRU cache wrapper for ward lookups (populated from geo.py)."""
    from app.utils.geo import lookup_ward
    return lookup_ward(ward_id)


# Simple in-memory cache for user profiles (TTL-less for now; refresh on update)
_user_cache: dict[str, dict[str, Any]] = {}


def cache_user_profile(user_id: str, profile: dict) -> None:
    """Cache a user profile in memory."""
    _user_cache[user_id] = profile


def get_cached_user(user_id: str) -> dict | None:
    """Get cached user profile."""
    return _user_cache.get(user_id)


def invalidate_user_cache(user_id: str) -> None:
    """Remove user from cache (on update/delete)."""
    _user_cache.pop(user_id, None)


def clear_all_caches() -> None:
    """Clear all in-memory caches. Used in testing."""
    get_cached_ward.cache_clear()
    _user_cache.clear()
