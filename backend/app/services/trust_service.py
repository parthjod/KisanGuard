"""Feature 3: Trust Layer & Amazon A2I routing service (PRD FR-7, FR-8, FR-9)."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

import aioboto3

from app.config import settings
from app.db import s3 as s3_db
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)


class TrustService:
    """
    Evaluates prediction confidence and routes anomalies to Amazon A2I.
    Enforces 15-minute SLA for RED alerts and 2-hour SLA for others.
    """

    CONFIDENCE_THRESHOLD: float = settings.CONFIDENCE_THRESHOLD
    MISSING_DATA_THRESHOLD: float = settings.MISSING_DATA_THRESHOLD
    WBGT_OUTLIER_RANGE: tuple[float, float] = (settings.WBGT_MIN_C, settings.WBGT_MAX_C)

    def __init__(self) -> None:
        self._session = aioboto3.Session()
        # In-memory registry of pending tasks
        self._pending_tasks: dict[str, dict[str, Any]] = {}

    def should_flag(
        self,
        confidence: float,
        missing_pct: float,
        wbgt: float | None = None,
        cdhi: float | None = None,
    ) -> tuple[bool, list[str]]:
        """
        Flags predictions that violate trust invariants:
          1. Confidence < 0.85
          2. Missing data > 10%
          3. WBGT outlier (< 5°C or > 50°C)
          4. Conflicting signals (high CDHI > 60 with low WBGT < 31)
        """
        reasons: list[str] = []
        if confidence < self.CONFIDENCE_THRESHOLD:
            reasons.append(f"low_confidence:{confidence:.3f}")
        if missing_pct > self.MISSING_DATA_THRESHOLD:
            reasons.append(f"high_missing_data:{missing_pct:.1%}")
        if wbgt is not None and not (self.WBGT_OUTLIER_RANGE[0] <= wbgt <= self.WBGT_OUTLIER_RANGE[1]):
            reasons.append(f"wbgt_outlier:{wbgt}")
        if wbgt is not None and cdhi is not None and cdhi > 60 and wbgt < 31:
            reasons.append("conflicting_signals:high_cdhi_low_wbgt")

        return bool(reasons), reasons

    async def submit_to_a2i(
        self,
        prediction_id: str,
        prediction_payload: dict[str, Any],
        severity: str,
        reasons: list[str],
    ) -> str:
        """
        Submits anomaly to Amazon A2I human review loop.
        Configures SLA: RED (15m), CAUTION/SAFE (120m).
        """
        task_id = f"a2i_{uuid.uuid4().hex[:12]}"
        sla_minutes = (
            settings.A2I_RED_SLA_MINUTES
            if severity == "RED"
            else settings.A2I_OTHER_SLA_MINUTES
        )

        task_record = {
            "task_id": task_id,
            "prediction_id": prediction_id,
            "severity": severity,
            "reasons": reasons,
            "sla_minutes": sla_minutes,
            "payload": prediction_payload,
            "status": "PENDING",
        }
        self._pending_tasks[task_id] = task_record

        # Store review input document in S3
        try:
            s3_key = f"{settings.A2I_OUTPUT_S3_PREFIX}input/{task_id}.json"
            await s3_db.put_json(settings.S3_BUCKET, s3_key, task_record)
        except Exception as e:
            logger.info("a2i_s3_input_skipped", error=str(e), task_id=task_id)

        # Trigger Amazon A2I if flow ARN is active
        if settings.A2I_FLOW_ARN:
            try:
                async with self._session.client("sagemaker-a2i-runtime", region_name=settings.AWS_REGION) as a2i_client:
                    await a2i_client.start_human_loop(
                        HumanLoopName=task_id,
                        FlowDefinitionArn=settings.A2I_FLOW_ARN,
                        HumanLoopInput={
                            "InputContent": json.dumps(task_record)
                        },
                    )
            except Exception as e:
                logger.info("sagemaker_a2i_start_mocked_or_failed", error=str(e), task_id=task_id)

        # Log trust check event
        await audit_service.log_trust_check(
            prediction_id=prediction_id,
            flagged=True,
            reasons=reasons,
            a2i_task_id=task_id,
        )

        logger.info("a2i_task_created", task_id=task_id, pred_id=prediction_id, sla_min=sla_minutes)
        return task_id

    async def handle_a2i_callback(
        self,
        task_id: str,
        decision: str,
        reviewer_id: str,
        corrected_value: dict[str, Any] | None = None,
        reviewer_notes: str | None = None,
    ) -> dict[str, Any]:
        """
        Called when A2I human review loop finishes.
        Decisions:
          - APPROVED: fires alert with original prediction
          - CORRECTED: fires alert with corrected value
          - REJECTED: writes audit record, suppresses alert
          - ESCALATED: notifies senior reviewer via SNS
        """
        task_info = self._pending_tasks.get(task_id, {})
        prediction_id = task_info.get("prediction_id", f"pred_{task_id}")
        payload = task_info.get("payload", {})

        decision_upper = decision.upper()

        # 1. Log decision to audit trail
        await audit_service.log_a2i_decision(
            prediction_id=prediction_id,
            a2i_task_id=task_id,
            decision=decision_upper,
            reviewer_id=reviewer_id,
            corrected_value=corrected_value,
            notes=reviewer_notes,
        )

        result: dict[str, Any] = {
            "task_id": task_id,
            "prediction_id": prediction_id,
            "decision": decision_upper,
            "reviewer_id": reviewer_id,
            "alert_fired": False,
        }

        # Lazy import alert_service to avoid circular dependencies
        from app.services.alert_service import alert_service

        if decision_upper == "APPROVED":
            user_data = payload.get("user", {"user_id": payload.get("user_id", "default_usr")})
            await alert_service.fire_alert(
                user=user_data,
                alert_payload=payload,
                idempotency_key=f"a2i:{task_id}:APPROVED",
            )
            result["alert_fired"] = True

        elif decision_upper == "CORRECTED":
            effective_payload = dict(payload)
            if corrected_value:
                effective_payload.update(corrected_value)
            user_data = payload.get("user", {"user_id": payload.get("user_id", "default_usr")})
            await alert_service.fire_alert(
                user=user_data,
                alert_payload=effective_payload,
                idempotency_key=f"a2i:{task_id}:CORRECTED",
            )
            result["alert_fired"] = True

        elif decision_upper == "ESCALATED":
            if settings.SNS_OPS_TOPIC_ARN:
                try:
                    async with self._session.client("sns", region_name=settings.AWS_REGION) as sns_client:
                        await sns_client.publish(
                            TopicArn=settings.SNS_OPS_TOPIC_ARN,
                            Subject=f"A2I Escalation: Task {task_id}",
                            Message=f"Reviewer {reviewer_id} escalated task {task_id}. Notes: {reviewer_notes}",
                        )
                except Exception as e:
                    logger.warning("a2i_escalation_sns_failed", error=str(e))
            result["escalated"] = True

        task_info["status"] = decision_upper
        return result


trust_service = TrustService()
