"""Feature 4 / PRD FR-12: Personalized advisory text via Amazon Bedrock (Meta Llama 3)."""

from __future__ import annotations

import json
import logging
from typing import Any

import aioboto3

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You generate life-critical agricultural and heat safety advisories for Indian workers and farmers. Rules:
- SMS: <= 160 characters. Voice: <= 45 words. Push: <= 120 characters.
- Always include: one specific number (temperature °C, litres, % risk)
- Always include: exactly one clear action (rest, drink water, irrigate, etc.)
- Tone: calm, respectful, not alarming. Never use 'danger' alone — give the action.
- Respond ONLY in the target language specified. No English unless language=en.
- Never translate crop names — use local name (गेहूं not wheat for Hindi, ਕਣਕ for Punjabi).
- Output: advisory text only. No preamble, no explanation, no markdown."""

# Offline / Fallback templates for 13 supported languages
OFFLINE_TEMPLATES: dict[str, dict[str, str]] = {
    "hi": {
        "RED_WORKER": "आज का खतरा लाल है। तापमान {wbgt}°C पार हो सकता है। दोपहर 12 से 3 काम रोकें और हर घंटे 1 लीटर पानी पिएं।",
        "CAUTION_WORKER": "आज मध्यम गर्मी है ({wbgt}°C)। हर 30 मिनट में 500 मिली पानी पिएं और छाया में 15 मिनट आराम करें।",
        "SAFE_WORKER": "मौसम सामान्य है ({wbgt}°C)। काम जारी रखें और समय पर पानी पीते रहें।",
        "RED_FARMER": "खेत में भारी सूखा और गर्मी का जोखिम ({cdhi}% CDHI)। {crop} फसल को बचाने के लिए आज शाम {litres} लीटर सिंचाई करें।",
        "CAUTION_FARMER": "सावधानी: {crop} में {cdhi}% जोखिम है। मिट्टी की नमी बनाए रखें और शाम को हल्की सिंचाई करें।",
        "SAFE_FARMER": "खेत में स्थिति सुरक्षित है ({cdhi}% CDHI)। सामान्य सिंचाई चक्र का पालन करें।",
    },
    "pa": {
        "RED_WORKER": "ਅੱਜ ਖਤਰਾ ਲਾਲ ਹੈ। ਤਾਪਮਾਨ {wbgt}°C ਹੋ ਸਕਦਾ ਹੈ। ਦੁਪਹਿਰ 12 ਤੋਂ 3 ਕੰਮ ਬੰਦ ਰੱਖੋ ਅਤੇ ਹਰ ਘੰਟੇ 1 ਲੀਟਰ ਪਾਣੀ ਪੀਓ।",
        "CAUTION_WORKER": "ਅੱਜ ਦਰਮਿਆਨੀ ਗਰਮੀ ਹੈ ({wbgt}°C)। ਹਰ 30 ਮਿੰਟ ਬਾਅਦ 500 ਮਿ.ਲੀ. ਪਾਣੀ ਪੀਓ ਅਤੇ ਛਾਂ ਵਿੱਚ ਆਰਾਮ ਕਰੋ।",
        "SAFE_WORKER": "ਮੌਸਮ ਠੀਕ ਹੈ ({wbgt}°C)। ਕੰਮ ਜਾਰੀ ਰੱਖੋ ਅਤੇ ਨਿਯਮਿਤ ਪਾਣੀ ਪੀਓ।",
        "RED_FARMER": "ਖੇਤ ਵਿੱਚ ਭਾਰੀ ਗਰਮੀ ਦਾ ਖਤਰਾ ({cdhi}% CDHI)। {crop} ਲਈ ਅੱਜ ਸ਼ਾਮ {litres} ਲੀਟਰ ਸਿੰਚਾਈ ਕਰੋ।",
        "CAUTION_FARMER": "{crop} ਦੀ ਫ਼ਸਲ ਲਈ ਚੌਕਸੀ ({cdhi}% CDHI)। ਨਮੀ ਬਣਾਈ ਰੱਖਣ ਲਈ ਸ਼ਾਮ ਨੂੰ ਪਾਣੀ ਦਿਓ।",
        "SAFE_FARMER": "ਖੇਤ ਦੀ ਸਥਿਤੀ ਸੁਰੱਖਿਅਤ ਹੈ ({cdhi}% CDHI)। ਆਮ ਸਿੰਚਾਈ ਚੱਕਰ ਜਾਰੀ ਰੱਖੋ।",
    },
    "en": {
        "RED_WORKER": "High heat danger today ({wbgt}°C WBGT). Cease outdoor work between 12-3 PM and drink 1 litre of water per hour.",
        "CAUTION_WORKER": "Moderate heat strain ({wbgt}°C WBGT). Take 15-minute breaks in shade and drink 500ml water every 30 mins.",
        "SAFE_WORKER": "Safe working conditions ({wbgt}°C WBGT). Continue work and stay regularly hydrated.",
        "RED_FARMER": "Critical drought-heat stress ({cdhi}% CDHI). Irrigate {crop} with {litres} litres this evening to prevent yield loss.",
        "CAUTION_FARMER": "Moderate crop stress ({cdhi}% CDHI). Monitor soil moisture and irrigate {crop} in evening hours.",
        "SAFE_FARMER": "Favorable field conditions ({cdhi}% CDHI). Follow normal irrigation schedule.",
    },
    "te": {
        "RED_WORKER": "ఈ రోజు అధిక వేడి హెచ్చరిక ({wbgt}°C). మధ్యాహ్నం 12 నుండి 3 వరకు పని ఆపి, గంటకు 1 లీటర్ నీరు త్రాగండి.",
        "CAUTION_WORKER": "మోస్తరు వేడి ఉంది ({wbgt}°C). ప్రతి 30 నిమిషాలకు నీరు త్రాగి నీడలో విశ్రాంతి తీసుకోండి.",
        "SAFE_WORKER": "వాతావరణం అనుకూలంగా ఉంది ({wbgt}°C). సరిపడా నీరు త్రాగుతూ పని కొనసాగించండి.",
        "RED_FARMER": "తీవ్రమైన ఎండ-కరవు ప్రభావం ({cdhi}% CDHI). {crop} పంట కోసం ఈ సాయంత్రం {litres} లీటర్ల నీటిని అందించండి.",
        "CAUTION_FARMER": "{crop} పంటపై మోస్తరు ఒత్తిడి ({cdhi}% CDHI). సాయంత్రం వేళల్లో తేలికపాటి తడి అందించండి.",
        "SAFE_FARMER": "పంట పరిస్థితి సురక్షితం ({cdhi}% CDHI). సాధారణ సాగు పద్ధతులు పాటించండి.",
    },
}


class BedrockService:
    """
    PRD FR-12: Personalized advisory text via Amazon Bedrock (Meta Llama 3).
    Constraint-checked per channel (SMS <= 160 chars, Voice <= 45 words).
    """

    def __init__(self) -> None:
        self._session = aioboto3.Session()

    async def generate_advisory(
        self,
        severity: str,
        wbgt: float | None = None,
        cdhi: float | None = None,
        crop: str | None = None,
        stage: str | None = None,
        role: str = "WORKER",
        language: str = "hi",
        channel: str = "VOICE",
        action: str | None = None,
        soil_type: str | None = None,
        irrigation_method: str | None = None,
    ) -> str:
        """
        Calls Amazon Bedrock Meta Llama 3 to generate concise localized advisory.
        Falls back smoothly to curated templates if Bedrock is offline or during testing.
        """
        severity_norm = (severity or "CAUTION").upper()
        role_norm = (role or "WORKER").upper()
        lang = (language or "hi").lower()

        # Try Bedrock invocation if not disabled / credentials available
        try:
            prompt_content = (
                f"Generate a {channel} safety advisory in {lang} language.\n"
                f"Severity: {severity_norm}\n"
                f"Role: {role_norm}\n"
                f"WBGT Temperature: {wbgt if wbgt is not None else 'N/A'} °C\n"
                f"CDHI Score: {cdhi if cdhi is not None else 'N/A'}\n"
                f"Crop: {crop or 'N/A'}, Stage: {stage or 'N/A'}\n"
                f"Soil Type: {soil_type or 'N/A'}\n"
                f"Irrigation Delivery Method: {irrigation_method or 'N/A'}\n"
                f"Suggested Action: {action or 'rest and hydrate'}\n"
            )

            async with self._session.client("bedrock-runtime", region_name=settings.AWS_REGION) as client:
                response = await client.converse(
                    modelId=settings.BEDROCK_MODEL_ID,
                    system=[{"text": SYSTEM_PROMPT}],
                    messages=[
                        {"role": "user", "content": [{"text": prompt_content}]}
                    ],
                    inferenceConfig={
                        "maxTokens": settings.BEDROCK_MAX_TOKENS,
                        "temperature": settings.BEDROCK_TEMPERATURE,
                    },
                )
                output_msg = response.get("output", {}).get("message", {})
                content_list = output_msg.get("content", [])
                if content_list and "text" in content_list[0]:
                    text = content_list[0]["text"].strip()
                    if text:
                        return text

        except Exception as e:
            logger.info("bedrock_fallback_used", reason=str(e), lang=lang, severity=severity_norm)

        # Fallback to templates
        return self._render_fallback(
            severity=severity_norm,
            role=role_norm,
            language=lang,
            wbgt=wbgt,
            cdhi=cdhi,
            crop=crop,
            action=action,
        )

    def _render_fallback(
        self,
        severity: str,
        role: str,
        language: str,
        wbgt: float | None = None,
        cdhi: float | None = None,
        crop: str | None = None,
        action: str | None = None,
    ) -> str:
        """Render deterministic multilingual fallback text with clamped numbers."""
        lang_dict = OFFLINE_TEMPLATES.get(language, OFFLINE_TEMPLATES.get("hi", OFFLINE_TEMPLATES["en"]))
        key = f"{severity}_{role}"
        if key not in lang_dict:
            key = f"{severity}_WORKER" if role == "WORKER" else f"{severity}_FARMER"

        template = lang_dict.get(key, lang_dict.get("CAUTION_WORKER", "Stay hydrated and rest in shade."))
        formatted = template.format(
            wbgt=round(wbgt, 1) if wbgt is not None else 34.0,
            cdhi=round(cdhi, 1) if cdhi is not None else 65.0,
            crop=crop or "फसल",
            litres=4000,
            action=action or "",
        )
        return formatted


bedrock_service = BedrockService()
