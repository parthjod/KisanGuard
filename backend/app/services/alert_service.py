"""Feature 4 / PRD FR-10, FR-11: Alert Routing & Delivery Orchestration Service."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.db import dynamo
from app.services.audit_service import audit_service
from app.services.bedrock_service import bedrock_service
from app.services.delivery_service import delivery_service
from app.services.fatigue_service import fatigue_service
from app.utils.errors import AlertFatigueLimitError, ConsentRequiredError

logger = logging.getLogger(__name__)


class AlertService:
    """
    Orchestrates alert routing, fatigue capping, LLM advisory synthesis,
    multi-channel dispatch (Voice/SMS/Push/WS), and delivery logging.
    """

    def __init__(self) -> None:
        # Active websocket connections mapped by org_id
        self._ws_subscribers: dict[str, list[Any]] = {}

    def register_ws(self, org_id: str, websocket: Any) -> None:
        """Register active WebSocket for live org dashboard."""
        if org_id not in self._ws_subscribers:
            self._ws_subscribers[org_id] = []
        self._ws_subscribers[org_id].append(websocket)

    def unregister_ws(self, org_id: str, websocket: Any) -> None:
        """Unregister closed WebSocket."""
        if org_id in self._ws_subscribers and websocket in self._ws_subscribers[org_id]:
            self._ws_subscribers[org_id].remove(websocket)

    async def route(self, prediction: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
        """
        Main routing logic per PRD §12:
          - confidence >= 0.85 AND severity != RED -> Direct Alert
          - confidence < 0.85 OR severity == RED   -> A2I Review First
        """
        confidence = float(prediction.get("confidence", 0.9))
        severity = prediction.get("severity", "LOW").upper()
        user_id = user.get("user_id", "usr_unknown")

        from app.services.trust_service import trust_service

        flagged, reasons = trust_service.should_flag(
            confidence=confidence,
            missing_pct=prediction.get("missing_feature_pct", 0.0),
            wbgt=prediction.get("wbgt_c"),
            cdhi=prediction.get("cdhi_score"),
        )

        # Force A2I review for all RED severity alerts per PRD trust layer
        if severity == "RED" and not flagged:
            flagged = True
            reasons.append("red_alert_mandatory_review")

        if flagged:
            task_id = await trust_service.submit_to_a2i(
                prediction_id=prediction.get("prediction_id", f"pred_{uuid.uuid4().hex[:8]}"),
                prediction_payload={"prediction": prediction, "user": user},
                severity=severity,
                reasons=reasons,
            )
            return {
                "action": "A2I_SUBMITTED",
                "a2i_task_id": task_id,
                "a2i_flagged": True,
                "reasons": reasons,
            }

        # Otherwise dispatch directly
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        idempotency_key = f"{user_id}:{today_str}:{severity}:1"
        return await self.fire_alert(user=user, alert_payload=prediction, idempotency_key=idempotency_key)

    async def fire_alert(
        self,
        user: dict[str, Any],
        alert_payload: dict[str, Any],
        idempotency_key: str,
    ) -> dict[str, Any]:
        """
        Checks fatigue caps, generates localized advisory, dispatches through
        appropriate channel (Voice/SMS/Push), records receipts and audit trail.
        """
        user_id = user.get("user_id", "usr_anon")
        role = (user.get("role") or "WORKER").upper()
        severity = (alert_payload.get("severity") or "CAUTION").upper()
        phone = user.get("phone", "+919999999999")
        lang = user.get("language", "hi")
        org_id = user.get("org_id", "org_default")

        # 1. DPDP Consent Check
        if not user.get("consent_given", True):
            logger.warning("alert_blocked_no_consent", user_id=user_id)
            raise ConsentRequiredError()

        # 2. Alert Fatigue Cap Check
        can_send, reason = await fatigue_service.can_send(user_id=user_id, severity=severity)
        if not can_send:
            logger.info("alert_blocked_fatigue", user_id=user_id, severity=severity, reason=reason)
            return {
                "alert_id": None,
                "status": "SUPPRESSED_FATIGUE",
                "reason": reason,
                "delivered": False,
            }

        alert_id = f"alt_{uuid.uuid4().hex[:12]}"
        prediction_id = alert_payload.get("prediction_id", f"pred_{uuid.uuid4().hex[:8]}")

        # 3. Channel selection based on Role (PRD §12)
        primary_channel = "VOICE" if role == "WORKER" else "SMS"

        # 4. Generate Advisory text via Bedrock
        advisory_text = await bedrock_service.generate_advisory(
            severity=severity,
            wbgt=alert_payload.get("wbgt_c"),
            cdhi=alert_payload.get("cdhi_score"),
            crop=user.get("crops", ["wheat"])[0] if user.get("crops") else None,
            stage=alert_payload.get("stage"),
            role=role,
            language=lang,
            channel=primary_channel,
            action=alert_payload.get("recommended_action"),
            soil_type=user.get("soil_type"),
            irrigation_method=user.get("irrigation_method"),
        )

        # 5. Dispatch Alert
        dispatch_result: dict[str, Any] = {}
        delivery_status = "DELIVERED"
        used_channel = primary_channel

        try:
            if primary_channel == "VOICE":
                dispatch_result = await delivery_service.send_voice(
                    phone=phone,
                    advisory_text=advisory_text,
                    lang=lang,
                    idempotency_key=idempotency_key,
                )
            else:
                dispatch_result = await delivery_service.send_sms(
                    phone=phone,
                    message=advisory_text,
                    lang=lang,
                    idempotency_key=idempotency_key,
                )
        except Exception as e:
            logger.warning("primary_channel_failed_trying_fallback", error=str(e), channel=primary_channel)
            # Try SMS fallback for workers if Voice fails
            if primary_channel == "VOICE":
                try:
                    used_channel = "SMS"
                    dispatch_result = await delivery_service.send_sms(
                        phone=phone,
                        message=advisory_text,
                        lang=lang,
                        idempotency_key=f"{idempotency_key}:fallback_sms",
                    )
                except Exception as fallback_e:
                    delivery_status = "FAILED"
                    logger.error("fallback_channel_failed", error=str(fallback_e))
            else:
                delivery_status = "FAILED"

        # Optional Pinpoint Push if user has endpoint
        endpoint_arn = user.get("pinpoint_endpoint_arn")
        if endpoint_arn:
            await delivery_service.send_push(
                pinpoint_endpoint_arn=endpoint_arn,
                payload={"title": f"KisanGuard: {severity} Alert", "body": advisory_text[:100]},
                idempotency_key=f"{idempotency_key}:push",
            )

        # 6. Increment fatigue counter
        if delivery_status == "DELIVERED":
            await fatigue_service.increment(user_id=user_id, severity=severity)

        # 7. Record Alert in DynamoDB (kisanguard-alerts)
        now_iso = datetime.now(timezone.utc).isoformat()
        alert_record = {
            "alert_id": alert_id,
            "user_id": user_id,
            "prediction_id": prediction_id,
            "ward_id": alert_payload.get("ward_id") or user.get("ward_id"),
            "plot_id": alert_payload.get("plot_id") or user.get("plot_id"),
            "org_id": org_id,
            "severity": severity,
            "wbgt_c": alert_payload.get("wbgt_c"),
            "psi": alert_payload.get("psi"),
            "cdhi_score": alert_payload.get("cdhi_score"),
            "confidence": alert_payload.get("confidence", 0.9),
            "a2i_reviewed": alert_payload.get("a2i_flagged", False),
            "a2i_decision": alert_payload.get("a2i_decision"),
            "channel": used_channel,
            "language": lang,
            "delivered": (delivery_status == "DELIVERED"),
            "delivered_at": now_iso,
            "message_preview": advisory_text[:50],
            "idempotency_key": idempotency_key,
            "user_acknowledged": False,
            "created_at": now_iso,
        }

        try:
            await dynamo.put_item(settings.DYNAMO_ALERTS_TABLE, alert_record)
        except Exception as e:
            logger.warning("save_alert_record_failed", error=str(e), alert_id=alert_id)

        # 8. Log Delivery to Audit Trail
        await audit_service.log_delivery(
            prediction_id=prediction_id,
            alert_id=alert_id,
            channel=used_channel,
            language=lang,
            status=delivery_status,
            delivered_at=now_iso,
            idempotency_key=idempotency_key,
        )

        # 9. Real-time broadcast to Org Dashboard
        if org_id:
            await self.broadcast_to_org(
                org_id=org_id,
                ward_id=alert_record.get("ward_id", ""),
                severity=severity,
                stats={"total_sent": 1},
            )

        return {
            "alert_id": alert_id,
            "status": delivery_status,
            "channel": used_channel,
            "delivered": (delivery_status == "DELIVERED"),
            "delivered_at": now_iso,
            "message": advisory_text,
            "idempotency_key": idempotency_key,
        }

    async def broadcast_to_org(
        self,
        org_id: str,
        ward_id: str,
        severity: str,
        stats: dict[str, Any],
    ) -> None:
        """Pushes real-time ALERT_FIRED and STATS_UPDATE to connected WebSockets."""
        subscribers = self._ws_subscribers.get(org_id, [])
        if not subscribers:
            return

        message = {
            "type": "ALERT_FIRED",
            "data": {
                "ward_id": ward_id,
                "severity": severity,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "stats": stats,
            },
        }

        dead_connections: list[Any] = []
        for ws in subscribers:
            try:
                await ws.send_json(message)
            except Exception:
                dead_connections.append(ws)

        for dead in dead_connections:
            if dead in subscribers:
                subscribers.remove(dead)


alert_service = AlertService()
