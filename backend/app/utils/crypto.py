"""KMS encrypt/decrypt for PII fields — DPDP Act 2023 compliance."""

from __future__ import annotations

import base64
import logging
from typing import Any

logger = logging.getLogger(__name__)


async def encrypt_pii(value: str, kms_client: Any, cmk_arn: str) -> str:
    """KMS-encrypt a PII field before DynamoDB write."""
    try:
        resp = await kms_client.encrypt(
            KeyId=cmk_arn,
            Plaintext=value.encode("utf-8"),
        )
        return base64.b64encode(resp["CiphertextBlob"]).decode("utf-8")
    except Exception as e:
        logger.error("kms_encrypt_failed", error=str(e))
        raise


async def decrypt_pii(ciphertext_b64: str, kms_client: Any) -> str:
    """KMS-decrypt a PII field on read."""
    try:
        blob = base64.b64decode(ciphertext_b64)
        resp = await kms_client.decrypt(CiphertextBlob=blob)
        return resp["Plaintext"].decode("utf-8")
    except Exception as e:
        logger.error("kms_decrypt_failed", error=str(e))
        raise


def mask_phone(phone: str) -> str:
    """Mask phone for logging (show last 4 digits only)."""
    if len(phone) > 4:
        return "*" * (len(phone) - 4) + phone[-4:]
    return "****"
