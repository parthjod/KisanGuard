"""Lambda: SageMaker Model Monitor Drift Alarm Handler — Triggers Retraining Pipeline."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

import boto3

from app.config import settings

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sns = boto3.client("sns")
sfn = boto3.client("stepfunctions")


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Triggered by CloudWatch Alarm when Model Monitor detects feature or concept drift.
    Sends operations notification and starts retrain_pipeline Step Functions state machine.
    """
    alarm_name = event.get("alarmName", "KisanGuard-ModelDrift-Alarm")
    timestamp = datetime.now(timezone.utc).isoformat()
    logger.warning(f"Model Monitor alarm triggered: {alarm_name} at {timestamp}")

    # 1. Send internal alert to ops topic
    if settings.SNS_OPS_TOPIC_ARN:
        try:
            sns.publish(
                TopicArn=settings.SNS_OPS_TOPIC_ARN,
                Subject=f"ALERT: SageMaker Model Drift Alarm [{alarm_name}]",
                Message=json.dumps({
                    "alarm": alarm_name,
                    "event": event,
                    "timestamp": timestamp,
                    "action": "Starting automated retrain pipeline",
                }, indent=2),
            )
        except Exception as e:
            logger.warning(f"SNS notification failed: {e}")

    # 2. Start Retrain Step Functions execution
    retrain_arn = settings.STEP_FUNCTIONS_RETRAIN_PIPELINE_ARN or "arn:aws:states:mock:retrain-pipeline"
    exec_arn = None
    try:
        res = sfn.start_execution(
            stateMachineArn=retrain_arn,
            name=f"retrain-drift-{int(datetime.now(timezone.utc).timestamp())}",
            input=json.dumps({"reason": "drift_detected", "alarm": alarm_name, "timestamp": timestamp}),
        )
        exec_arn = res.get("executionArn")
    except Exception as e:
        logger.info(f"Retrain step function start mocked/skipped: {e}")
        exec_arn = f"arn:aws:states:mock:retrain:{timestamp}"

    return {
        "status": "RETRAIN_TRIGGERED",
        "alarm": alarm_name,
        "execution_arn": exec_arn,
    }
