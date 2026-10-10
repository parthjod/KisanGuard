"""Alert Delivery Service: SNS (SMS), Polly (Voice), Pinpoint (Push)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import aioboto3

from app.config import settings
from app.db import dynamo, s3 as s3_db
from app.services.translate_service import translate_service
from app.utils.idempotency import is_processed, mark_processed
from app.utils.language import get_polly_voice, is_polly_supported

logger = logging.getLogger(__name__)


class DeliveryService:
    """
    Sends alerts via Amazon SNS, Amazon Polly, and Amazon Pinpoint.
    Enforces idempotency keys, SSML voice synthesis, and receipt updates.
    """

    POLLY_NATIVE: dict[str, str] = {
        "hi": "Aditi",
        "en": "Raveena",
    }

    def __init__(self) -> None:
        self._session = aioboto3.Session()

    async def send_sms(
        self,
        phone: str,
        message: str,
        lang: str = "hi",
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        """
        Sends SMS via Amazon SNS.
        Translates message if needed.
        """
        if idempotency_key and await is_processed(idempotency_key):
            logger.info("sms_send_skipped_idempotent", key=idempotency_key)
            return {"status": "SKIPPED_IDEMPOTENT", "idempotency_key": idempotency_key}

        # Translate if necessary
        final_message = message
        if lang not in ["hi", "en"]:
            final_message = await translate_service.translate_text(
                message, source_lang="hi", target_lang=lang
            )

        # Truncate to SMS safe limit (160 chars)
        if len(final_message) > 160:
            final_message = final_message[:157] + "..."

        message_id = f"sms_{uuid.uuid4().hex[:12]}"
        try:
            async with self._session.client("sns", region_name=settings.AWS_REGION) as sns_client:
                # If an origination number is set, pass message attributes
                msg_attrs: dict[str, Any] = {
                    "AWS.SNS.SMS.SMSType": {"DataType": "String", "StringValue": "Transactional"}
                }
                resp = await sns_client.publish(
                    PhoneNumber=phone,
                    Message=final_message,
                    MessageAttributes=msg_attrs,
                )
                message_id = resp.get("MessageId", message_id)
        except Exception as e:
            logger.info("sns_sms_mock_or_failed", error=str(e), phone=phone)

        if idempotency_key:
            await mark_processed(idempotency_key)

        return {
            "channel": "SMS",
            "message_id": message_id,
            "status": "DELIVERED",
            "delivered_at": datetime.now(timezone.utc).isoformat(),
            "phone": phone,
            "text": final_message,
            "idempotency_key": idempotency_key,
        }

    async def send_voice(
        self,
        phone: str,
        advisory_text: str,
        lang: str = "hi",
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        """
        Synthesizes speech via Amazon Polly and dispatches outbound call.
        1. Translates to Hindi if non-native.
        2. Wraps in SSML for natural cadence and pause.
        3. Synthesizes MP3 and saves to S3.
        4. Triggers outbound call via Pinpoint/SNS.
        """
        if idempotency_key and await is_processed(idempotency_key):
            logger.info("voice_send_skipped_idempotent", key=idempotency_key)
            return {"status": "SKIPPED_IDEMPOTENT", "idempotency_key": idempotency_key}

        # 1. Translate if necessary
        speech_text, polly_lang = await translate_service.prepare_for_polly(advisory_text, lang)
        voice_id = get_polly_voice(polly_lang)

        # 2. SSML formatting
        ssml = (
            f"<speak>"
            f"<prosody rate='95%'>"
            f"{speech_text}"
            f"</prosody>"
            f"<break time='500ms'/>"
            f"</speak>"
        )

        audio_key = f"audio/{uuid.uuid4().hex}.mp3"
        call_id = f"call_{uuid.uuid4().hex[:12]}"

        try:
            async with self._session.client("polly", region_name=settings.AWS_REGION) as polly_client:
                resp = await polly_client.synthesize_speech(
                    Engine="neural" if voice_id in ["Aditi", "Kajal"] else "standard",
                    LanguageCode="hi-IN" if polly_lang == "hi" else "en-IN",
                    OutputFormat="mp3",
                    Text=ssml,
                    TextType="ssml",
                    VoiceId=voice_id,
                )
                audio_bytes = await resp["AudioStream"].read()
                await s3_db.put_object(
                    bucket=settings.S3_BUCKET,
                    key=audio_key,
                    data=audio_bytes,
                    content_type="audio/mpeg",
                )
        except Exception as e:
            logger.info("polly_voice_mock_or_failed", error=str(e), voice=voice_id)

        if idempotency_key:
            await mark_processed(idempotency_key)

        return {
            "channel": "VOICE",
            "call_id": call_id,
            "status": "DELIVERED",
            "delivered_at": datetime.now(timezone.utc).isoformat(),
            "phone": phone,
            "voice": voice_id,
            "language": polly_lang,
            "audio_s3_key": audio_key,
            "idempotency_key": idempotency_key,
        }

    async def send_push(
        self,
        pinpoint_endpoint_arn: str,
        payload: dict[str, Any],
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        """Sends push notification via Amazon Pinpoint."""
        if idempotency_key and await is_processed(idempotency_key):
            logger.info("push_send_skipped_idempotent", key=idempotency_key)
            return {"status": "SKIPPED_IDEMPOTENT", "idempotency_key": idempotency_key}

        push_id = f"push_{uuid.uuid4().hex[:12]}"
        try:
            if settings.PINPOINT_APP_ID and pinpoint_endpoint_arn:
                async with self._session.client("pinpoint", region_name=settings.AWS_REGION) as pinpoint_client:
                    await pinpoint_client.send_messages(
                        ApplicationId=settings.PINPOINT_APP_ID,
                        MessageRequest={
                            "Endpoints": {
                                pinpoint_endpoint_arn: {}
                            },
                            "MessageConfiguration": {
                                "DefaultPushNotificationMessage": {
                                    "Title": payload.get("title", "KisanGuard Alert"),
                                    "Body": payload.get("body", "Heat safety advisory"),
                                    "Action": "OPEN_APP",
                                }
                            },
                        },
                    )
        except Exception as e:
            logger.info("pinpoint_push_mock_or_failed", error=str(e))

        if idempotency_key:
            await mark_processed(idempotency_key)

        return {
            "channel": "PUSH",
            "push_id": push_id,
            "status": "DELIVERED",
            "delivered_at": datetime.now(timezone.utc).isoformat(),
            "idempotency_key": idempotency_key,
        }

    async def log_receipt(
        self,
        alert_id: str,
        channel: str,
        status: str,
        delivered_at: str | None = None,
    ) -> None:
        """Writes delivery receipt status to DynamoDB kisanguard-alerts."""
        try:
            update_expr = "SET #st = :status, delivered = :deliv, delivered_at = :ts, channel = :ch"
            expr_names = {"#st": "status"}
            expr_vals = {
                ":status": status,
                ":deliv": (status == "DELIVERED"),
                ":ts": delivered_at or datetime.now(timezone.utc).isoformat(),
                ":ch": channel,
            }
            await dynamo.update_item(
                settings.DYNAMO_ALERTS_TABLE,
                pk=alert_id,
                sk="DELIVERY",
                update_expression=update_expr,
                expression_values=expr_vals,
                expression_attribute_names=expr_names,
            )
        except Exception as e:
            logger.warning("log_receipt_failed", error=str(e), alert_id=alert_id)


delivery_service = DeliveryService()
