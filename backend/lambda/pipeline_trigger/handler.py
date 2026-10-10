"""Lambda: Pipeline Trigger Handler — Starts Step Functions orchestration when all sources ready."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
sfn = boto3.client("stepfunctions")

PIPELINE_TABLE = "kisanguard-pipeline-status"
STEP_FUNCTIONS_ARN = "arn:aws:states:ap-south-1:123456789012:stateMachine:kisanguard-alert-pipeline"


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Listens for EventBridge ingestion completion events.
    When IMD + SMAP + SATELLITE are ready, initiates Step Functions pipeline execution.
    """
    detail_type = event.get("detail-type", "")
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    table = dynamodb.Table(PIPELINE_TABLE)

    # 1. Update source status
    source_flag = "imd_ready" if "imd" in detail_type else ("smap_ready" if "smap" in detail_type else "satellite_ready")

    try:
        resp = table.update_item(
            Key={"date": today_str, "SK": "STATUS"},
            UpdateExpression=f"SET {source_flag} = :t, {source_flag}_at = :ts",
            ExpressionAttributeValues={
                ":t": True,
                ":ts": datetime.now(timezone.utc).isoformat(),
            },
            ReturnValues="ALL_NEW",
        )
        status_item = resp.get("Attributes", {})
    except Exception as e:
        logger.warning(f"Pipeline status update failed: {e}")
        status_item = {source_flag: True}

    # 2. Check if all 3 sources ready
    imd = status_item.get("imd_ready", False)
    smap = status_item.get("smap_ready", False)
    satellite = status_item.get("satellite_ready", False)
    already_started = status_item.get("step_functions_execution_arn") is not None

    if imd and smap and satellite and not already_started:
        logger.info(f"All data sources ready for {today_str}. Starting Step Functions.")

        payload = {
            "date": today_str,
            "ward_list": ["RJ-JD-042", "RJ-JD-043", "PB-LD-015"],
            "plot_list": ["PB-LD-F-2847"],
            "data_sources_available": ["IMD", "SMAP", "SATELLITE"],
        }

        exec_arn = None
        try:
            res = sfn.start_execution(
                stateMachineArn=STEP_FUNCTIONS_ARN,
                name=f"alert-run-{today_str}",
                input=json.dumps(payload),
            )
            exec_arn = res.get("executionArn")
        except Exception as e:
            logger.info(f"Step Functions start mocked/skipped: {e}")
            exec_arn = f"arn:aws:states:mock:exec:{today_str}"

        # Record started ARN
        table.update_item(
            Key={"date": today_str, "SK": "STATUS"},
            UpdateExpression="SET step_functions_execution_arn = :arn, started_at = :ts",
            ExpressionAttributeValues={
                ":arn": exec_arn,
                ":ts": datetime.now(timezone.utc).isoformat(),
            },
        )
        return {"status": "PIPELINE_STARTED", "execution_arn": exec_arn}

    return {
        "status": "WAITING_SOURCES",
        "ready": {"imd": imd, "smap": smap, "satellite": satellite},
    }
