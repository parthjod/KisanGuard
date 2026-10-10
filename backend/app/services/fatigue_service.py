"""Alert Fatigue Management (PRD §12). Caps alerts to avoid alarming farmers/workers."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from app.config import settings
from app.db import dynamo

logger = logging.getLogger(__name__)


class FatigueService:
    """
    Enforces daily alert fatigue caps per user:
      - Max 1 RED alert per day
      - Max 3 CAUTION alerts per day
      - Respects opt_out_until timestamp
    """

    CAPS: dict[str, int] = {
        "RED": settings.MAX_RED_ALERTS_PER_DAY,
        "CAUTION": settings.MAX_CAUTION_ALERTS_PER_DAY,
        "SAFE": 0,
    }

    def __init__(self) -> None:
        # In-memory tracking fallback for local development or fast tests
        self._memory_counts: dict[str, dict[str, int]] = {}
        self._memory_opt_outs: dict[str, str] = {}

    async def can_send(self, user_id: str, severity: str) -> tuple[bool, str]:
        """
        Evaluates whether an alert of given severity can be delivered to user_id.
        Returns (can_send, reason_if_blocked).
        """
        severity_norm = severity.upper()
        if severity_norm not in self.CAPS or self.CAPS[severity_norm] == 0:
            return False, f"severity_{severity_norm}_not_alertable"

        now = datetime.now(timezone.utc)

        # 1. Check user profile in DynamoDB
        user_item = None
        try:
            user_item = await dynamo.get_item(
                settings.DYNAMO_USERS_TABLE,
                pk=user_id,
                sk="PROFILE",
            )
        except Exception as e:
            logger.warning("fatigue_dynamo_lookup_failed", error=str(e), user_id=user_id)

        # 2. Check opt_out_until
        opt_out_until_str = (
            user_item.get("opt_out_until")
            if user_item
            else self._memory_opt_outs.get(user_id)
        )
        if opt_out_until_str:
            try:
                opt_out_dt = datetime.fromisoformat(opt_out_until_str)
                if opt_out_dt > now:
                    return False, f"user_opted_out_until:{opt_out_until_str}"
            except ValueError:
                pass

        # 3. Check daily counts
        current_count = 0
        if user_item and "alert_counts_today" in user_item:
            counts = user_item.get("alert_counts_today", {})
            current_count = counts.get(severity_norm, 0)
        else:
            current_count = self._memory_counts.get(user_id, {}).get(severity_norm, 0)

        max_allowed = self.CAPS.get(severity_norm, 1)
        if current_count >= max_allowed:
            return False, f"cap_reached:{current_count}/{max_allowed}_for_{severity_norm}"

        return True, "ok"

    async def increment(self, user_id: str, severity: str) -> None:
        """
        Increments daily alert counter atomically in DynamoDB,
        and synchronizes with in-memory store.
        """
        severity_norm = severity.upper()

        # Update in-memory count
        if user_id not in self._memory_counts:
            self._memory_counts[user_id] = {"RED": 0, "CAUTION": 0}
        self._memory_counts[user_id][severity_norm] = (
            self._memory_counts[user_id].get(severity_norm, 0) + 1
        )

        # Update DynamoDB atomically
        try:
            update_expr = f"ADD alert_counts_today.{severity_norm} :inc"
            expr_attrs = {":inc": 1}
            await dynamo.update_item(
                settings.DYNAMO_USERS_TABLE,
                pk=user_id,
                sk="PROFILE",
                update_expression=update_expr,
                expression_values=expr_attrs,
            )
        except Exception as e:
            logger.warning("fatigue_dynamo_inc_failed", error=str(e), user_id=user_id)

    async def opt_out(self, user_id: str, hours: int = 24) -> str:
        """User opts out of alerts for specified number of hours."""
        opt_out_until = (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()
        self._memory_opt_outs[user_id] = opt_out_until

        try:
            await dynamo.update_item(
                settings.DYNAMO_USERS_TABLE,
                pk=user_id,
                sk="PROFILE",
                update_expression="SET opt_out_until = :val",
                expression_values={":val": opt_out_until},
            )
        except Exception as e:
            logger.warning("fatigue_opt_out_dynamo_failed", error=str(e), user_id=user_id)

        return opt_out_until

    async def reset_daily(self) -> None:
        """Resets all daily counters (called at 00:00 IST)."""
        self._memory_counts.clear()
        logger.info("daily_fatigue_counters_reset")


fatigue_service = FatigueService()
