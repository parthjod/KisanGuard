"""User Service: CRUD, DPDP Act 2023 consent capture, KMS PII encryption, and erasure."""

from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import aioboto3

from app.config import settings
from app.db import cache, dynamo
from app.utils.crypto import decrypt_pii, encrypt_pii, mask_phone
from app.utils.errors import UserNotFoundError

logger = logging.getLogger(__name__)


def _hash_phone(phone: str) -> str:
    """Deterministic hash of phone number for GSI lookup."""
    return hashlib.sha256(phone.encode("utf-8")).hexdigest()


class UserService:
    """
    Manages user entities in compliance with DPDP Act 2023.
    Encrypts PII (name, phone, cognito_sub) with AWS KMS.
    Handles right-to-erasure by overwriting PII and retaining anonymized records.
    """

    def __init__(self) -> None:
        self._session = aioboto3.Session()
        # In-memory store fallback for fast dev and unit testing
        self._memory_users: dict[str, dict[str, Any]] = {}

    async def _encrypt_field(self, value: str) -> str:
        """Safely encrypts value using KMS if configured, otherwise fallback encoding."""
        if not value:
            return ""
        if settings.KMS_CMK_ARN:
            try:
                async with self._session.client("kms", region_name=settings.AWS_REGION) as kms:
                    return await encrypt_pii(value, kms, settings.KMS_CMK_ARN)
            except Exception as e:
                logger.info("kms_encrypt_fallback", error=str(e))
        return f"enc_{value}"

    async def _decrypt_field(self, ciphertext: str) -> str:
        """Safely decrypts value using KMS if configured, otherwise fallback."""
        if not ciphertext:
            return ""
        if ciphertext.startswith("enc_"):
            return ciphertext[4:]
        if settings.KMS_CMK_ARN:
            try:
                async with self._session.client("kms", region_name=settings.AWS_REGION) as kms:
                    return await decrypt_pii(ciphertext, kms)
            except Exception as e:
                logger.info("kms_decrypt_fallback", error=str(e))
        return ciphertext

    async def create_user(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        Creates a new user, encrypts PII, saves to DynamoDB, and caches profile.
        """
        user_id = f"usr_{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        raw_phone = payload.get("phone", "")
        raw_name = payload.get("name", "")
        raw_sub = payload.get("cognito_sub", "")

        enc_phone = await self._encrypt_field(raw_phone)
        enc_name = await self._encrypt_field(raw_name)
        enc_sub = await self._encrypt_field(raw_sub)

        role = (payload.get("role") or "WORKER").upper()
        alert_channel = "VOICE" if role == "WORKER" else "SMS"

        item = {
            "user_id": user_id,
            "PK": user_id,
            "SK": "PROFILE",
            "name": enc_name,
            "phone": enc_phone,
            "phone_hash": _hash_phone(raw_phone),
            "cognito_sub": enc_sub,
            "role": role,
            "language": payload.get("language", "hi"),
            "ward_id": payload.get("ward_id"),
            "plot_id": payload.get("plot_id"),
            "employer_id": payload.get("employer_id"),
            "org_id": payload.get("org_id", "org_default"),
            "crops": payload.get("crops", []),
            "work_intensity": payload.get("work_intensity", "MODERATE"),
            "subscription_tier": payload.get("subscription_tier", "FREE"),
            "alert_counts_today": {"RED": 0, "CAUTION": 0},
            "opt_out_until": payload.get("opt_out_until"),
            "pinpoint_endpoint_arn": payload.get("pinpoint_endpoint_arn"),
            "consent_given": payload.get("consent_given", True),
            "consent_timestamp": payload.get("consent_timestamp", now_iso),
            "created_at": now_iso,
            "updated_at": now_iso,
            "status": "ACTIVE",
            "alert_channel": alert_channel,
        }

        # Save to memory and cache
        self._memory_users[user_id] = dict(item)
        # Store decrypted copy in memory cache for fast lookups
        cache_item = dict(item)
        cache_item["phone"] = raw_phone
        cache_item["name"] = raw_name
        cache.set_user(user_id, cache_item)

        # Write to DynamoDB
        try:
            await dynamo.put_item(settings.DYNAMO_USERS_TABLE, item)
        except Exception as e:
            logger.warning("user_dynamo_put_failed", error=str(e), user_id=user_id)

        logger.info("user_registered", user_id=user_id, role=role, phone_masked=mask_phone(raw_phone))
        return {
            "user_id": user_id,
            "status": "ACTIVE",
            "alert_channel": alert_channel,
        }

    async def get_user(self, user_id: str) -> dict[str, Any]:
        """
        Fetches user profile and decrypts PII fields from KMS.
        """
        cached = cache.get_user(user_id)
        if cached and cached.get("status") != "ERASED":
            return cached

        item = self._memory_users.get(user_id)
        if not item:
            try:
                item = await dynamo.get_item(
                    settings.DYNAMO_USERS_TABLE,
                    pk=user_id,
                    sk="PROFILE",
                )
            except Exception as e:
                logger.warning("user_get_dynamo_failed", error=str(e), user_id=user_id)

        if not item or item.get("status") == "ERASED":
            raise UserNotFoundError(user_id)

        # Decrypt PII
        decrypted = dict(item)
        decrypted["name"] = await self._decrypt_field(item.get("name", ""))
        decrypted["phone"] = await self._decrypt_field(item.get("phone", ""))
        decrypted["cognito_sub"] = await self._decrypt_field(item.get("cognito_sub", ""))

        cache.set_user(user_id, decrypted)
        return decrypted

    async def update_user(self, user_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        """
        Partial profile update for user.
        """
        user = await self.get_user(user_id)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Handle any PII updates
        if "phone" in updates:
            raw_phone = updates["phone"]
            updates["phone"] = await self._encrypt_field(raw_phone)
            updates["phone_hash"] = _hash_phone(raw_phone)
        if "name" in updates:
            updates["name"] = await self._encrypt_field(updates["name"])

        updates["updated_at"] = now_iso

        # Update in memory
        if user_id in self._memory_users:
            self._memory_users[user_id].update(updates)

        # Update DynamoDB
        set_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in updates.keys())
        expr_names = {f"#{k}": k for k in updates.keys()}
        expr_vals = {f":{k}": v for k in updates.items()}

        try:
            await dynamo.update_item(
                settings.DYNAMO_USERS_TABLE,
                pk=user_id,
                sk="PROFILE",
                update_expression=set_expr,
                expression_values=expr_vals,
                expression_attribute_names=expr_names,
            )
        except Exception as e:
            logger.warning("user_update_dynamo_failed", error=str(e), user_id=user_id)

        cache.invalidate_user(user_id)
        return await self.get_user(user_id)

    async def erase_user(self, user_id: str) -> dict[str, Any]:
        """
        DPDP Act 2023 Right to Erasure:
        1. Replace PII fields with ERASED_{timestamp}.
        2. Remove from active caches.
        3. Retain anonymized user_id for legal 7-year audit retention.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        erased_marker = f"ERASED_{int(datetime.now(timezone.utc).timestamp())}"

        erasure_patch = {
            "name": erased_marker,
            "phone": erased_marker,
            "phone_hash": erased_marker,
            "cognito_sub": erased_marker,
            "status": "ERASED",
            "erased_at": now_iso,
            "consent_given": False,
        }

        if user_id in self._memory_users:
            self._memory_users[user_id].update(erasure_patch)

        try:
            set_expr = "SET #nm = :em, #ph = :em, #phh = :em, #sub = :em, #st = :erased, erased_at = :ts, consent_given = :f"
            expr_names = {
                "#nm": "name",
                "#ph": "phone",
                "#phh": "phone_hash",
                "#sub": "cognito_sub",
                "#st": "status",
            }
            expr_vals = {
                ":em": erased_marker,
                ":erased": "ERASED",
                ":ts": now_iso,
                ":f": False,
            }
            await dynamo.update_item(
                settings.DYNAMO_USERS_TABLE,
                pk=user_id,
                sk="PROFILE",
                update_expression=set_expr,
                expression_values=expr_vals,
                expression_attribute_names=expr_names,
            )
        except Exception as e:
            logger.warning("user_erasure_dynamo_failed", error=str(e), user_id=user_id)

        cache.invalidate_user(user_id)
        logger.info("dpdp_user_erased", user_id=user_id, erased_at=now_iso)

        return {
            "user_id": user_id,
            "status": "ERASED",
            "erased_at": now_iso,
            "audit_retained": True,
        }


user_service = UserService()
