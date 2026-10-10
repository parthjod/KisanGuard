"""S3 read/write/presign helpers (async via aioboto3)."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

import aioboto3

from app.config import settings

logger = logging.getLogger(__name__)

_session = aioboto3.Session()


def _endpoint_url() -> dict:
    if settings.LOCALSTACK_ENDPOINT:
        return {"endpoint_url": settings.LOCALSTACK_ENDPOINT}
    return {}


async def get_json(key: str, bucket: str | None = None) -> dict | None:
    """Read a JSON object from S3. Returns None if not found."""
    bucket = bucket or settings.S3_BUCKET
    async with _session.client("s3", region_name=settings.AWS_REGION, **_endpoint_url()) as s3:
        try:
            resp = await s3.get_object(Bucket=bucket, Key=key)
            body = await resp["Body"].read()
            return json.loads(body)
        except Exception as e:
            if "NoSuchKey" in str(e) or "404" in str(e):
                return None
            logger.error("s3_get_json_error", key=key, error=str(e))
            raise


async def put_json(key: str, data: dict, bucket: str | None = None) -> None:
    """Write a JSON object to S3."""
    bucket = bucket or settings.S3_BUCKET
    async with _session.client("s3", region_name=settings.AWS_REGION, **_endpoint_url()) as s3:
        await s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(data, default=str).encode("utf-8"),
            ContentType="application/json",
        )


async def put_bytes(key: str, data: bytes, content_type: str = "application/octet-stream",
                    bucket: str | None = None) -> None:
    """Write raw bytes to S3."""
    bucket = bucket or settings.S3_BUCKET
    async with _session.client("s3", region_name=settings.AWS_REGION, **_endpoint_url()) as s3:
        await s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )


async def generate_presigned_url(key: str, expiry_seconds: int = 86400,
                                  bucket: str | None = None) -> str:
    """Generate a pre-signed download URL (default 24h expiry)."""
    bucket = bucket or settings.S3_BUCKET
    async with _session.client("s3", region_name=settings.AWS_REGION, **_endpoint_url()) as s3:
        url = await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expiry_seconds,
        )
        return url


async def check_cache(key: str, max_age_minutes: int = 60,
                      bucket: str | None = None) -> dict | None:
    """
    Check S3 for cached data. Returns data if fresh (< max_age_minutes old),
    None if stale or missing.
    """
    data = await get_json(key, bucket)
    if data and "generated_at" in data:
        generated = datetime.fromisoformat(data["generated_at"].replace("Z", "+00:00"))
        age_minutes = (datetime.now(timezone.utc) - generated).total_seconds() / 60
        if age_minutes < max_age_minutes:
            return data
    return None
