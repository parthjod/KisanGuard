"""DynamoDB async wrappers via aioboto3."""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import aioboto3
from boto3.dynamodb.conditions import Attr, Key

from app.config import settings

logger = logging.getLogger(__name__)

_session = aioboto3.Session()


def _endpoint_url() -> dict:
    """Return endpoint_url kwarg if localstack is configured."""
    if settings.LOCALSTACK_ENDPOINT:
        return {"endpoint_url": settings.LOCALSTACK_ENDPOINT}
    return {}


def _serialize(obj: Any) -> Any:
    """Convert Python types for DynamoDB (floats → Decimal, etc.)."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(v) for v in obj]
    return obj


def _deserialize(obj: Any) -> Any:
    """Convert DynamoDB types back to Python (Decimal → float, etc.)."""
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    if isinstance(obj, dict):
        return {k: _deserialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_deserialize(v) for v in obj]
    return obj


async def put_item(table_name: str, item: dict) -> None:
    """Write an item to DynamoDB."""
    async with _session.resource("dynamodb", region_name=settings.AWS_REGION, **_endpoint_url()) as dynamodb:
        table = await dynamodb.Table(table_name)
        await table.put_item(Item=_serialize(item))


async def get_item(table_name: str, key: dict) -> dict | None:
    """Get a single item by primary key."""
    async with _session.resource("dynamodb", region_name=settings.AWS_REGION, **_endpoint_url()) as dynamodb:
        table = await dynamodb.Table(table_name)
        resp = await table.get_item(Key=key)
        item = resp.get("Item")
        return _deserialize(item) if item else None


async def update_item(table_name: str, key: dict, updates: dict) -> dict:
    """Update specific attributes on an existing item."""
    expr_parts = []
    expr_values = {}
    expr_names = {}
    for i, (attr, val) in enumerate(updates.items()):
        safe_name = f"#attr{i}"
        safe_val = f":val{i}"
        expr_parts.append(f"{safe_name} = {safe_val}")
        expr_names[safe_name] = attr
        expr_values[safe_val] = _serialize(val)

    update_expr = "SET " + ", ".join(expr_parts)

    async with _session.resource("dynamodb", region_name=settings.AWS_REGION, **_endpoint_url()) as dynamodb:
        table = await dynamodb.Table(table_name)
        resp = await table.update_item(
            Key=key,
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ReturnValues="ALL_NEW",
        )
        return _deserialize(resp.get("Attributes", {}))


async def delete_item(table_name: str, key: dict) -> None:
    """Delete an item by primary key."""
    async with _session.resource("dynamodb", region_name=settings.AWS_REGION, **_endpoint_url()) as dynamodb:
        table = await dynamodb.Table(table_name)
        await table.delete_item(Key=key)


async def query_items(
    table_name: str,
    key_condition: Any,
    index_name: str | None = None,
    limit: int = 100,
    scan_forward: bool = False,
    filter_expression: Any = None,
) -> list[dict]:
    """Query items with key condition expression."""
    async with _session.resource("dynamodb", region_name=settings.AWS_REGION, **_endpoint_url()) as dynamodb:
        table = await dynamodb.Table(table_name)
        kwargs: dict[str, Any] = {
            "KeyConditionExpression": key_condition,
            "Limit": limit,
            "ScanIndexForward": scan_forward,
        }
        if index_name:
            kwargs["IndexName"] = index_name
        if filter_expression:
            kwargs["FilterExpression"] = filter_expression

        resp = await table.query(**kwargs)
        return [_deserialize(item) for item in resp.get("Items", [])]


async def atomic_increment(table_name: str, key: dict, attribute: str, path: str | None = None) -> int:
    """
    Atomic counter increment. For nested attributes like alert_counts_today.RED,
    pass attribute='alert_counts_today' and path='RED'.
    """
    async with _session.resource("dynamodb", region_name=settings.AWS_REGION, **_endpoint_url()) as dynamodb:
        table = await dynamodb.Table(table_name)

        if path:
            resp = await table.update_item(
                Key=key,
                UpdateExpression=f"SET #attr.#path = if_not_exists(#attr.#path, :zero) + :one",
                ExpressionAttributeNames={"#attr": attribute, "#path": path},
                ExpressionAttributeValues={":one": 1, ":zero": 0},
                ReturnValues="ALL_NEW",
            )
        else:
            resp = await table.update_item(
                Key=key,
                UpdateExpression=f"SET #attr = if_not_exists(#attr, :zero) + :one",
                ExpressionAttributeNames={"#attr": attribute},
                ExpressionAttributeValues={":one": 1, ":zero": 0},
                ReturnValues="ALL_NEW",
            )
        attrs = _deserialize(resp.get("Attributes", {}))
        if path:
            return attrs.get(attribute, {}).get(path, 1)
        return attrs.get(attribute, 1)


async def scan_table(table_name: str, filter_expression: Any = None, limit: int = 1000) -> list[dict]:
    """Full table scan (use sparingly)."""
    async with _session.resource("dynamodb", region_name=settings.AWS_REGION, **_endpoint_url()) as dynamodb:
        table = await dynamodb.Table(table_name)
        kwargs: dict[str, Any] = {"Limit": limit}
        if filter_expression:
            kwargs["FilterExpression"] = filter_expression
        resp = await table.scan(**kwargs)
        return [_deserialize(item) for item in resp.get("Items", [])]
