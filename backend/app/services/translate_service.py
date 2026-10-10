"""Amazon Translate service for non-native Polly languages and SMS localization."""

from __future__ import annotations

import logging
from typing import Any

import aioboto3

from app.config import settings
from app.utils.language import get_translate_target, is_polly_supported

logger = logging.getLogger(__name__)


class TranslateService:
    """
    Translates text between Indic languages and Hindi/English.
    Used when voice delivery requires Polly (Hindi) or SMS requires local script.
    """

    def __init__(self) -> None:
        self._session = aioboto3.Session()
        self._cache: dict[tuple[str, str, str], str] = {}

    async def translate_text(
        self,
        text: str,
        source_lang: str = "auto",
        target_lang: str = "hi",
    ) -> str:
        """
        Translates text via Amazon Translate.
        Returns original text if source == target or on error.
        """
        if not text or source_lang == target_lang:
            return text

        cache_key = (text, source_lang, target_lang)
        if cache_key in self._cache:
            return self._cache[cache_key]

        try:
            async with self._session.client("translate", region_name=settings.AWS_REGION) as client:
                response = await client.translate_text(
                    Text=text,
                    SourceLanguageCode=source_lang,
                    TargetLanguageCode=target_lang,
                )
                translated = response.get("TranslatedText", text)
                self._cache[cache_key] = translated
                return translated
        except Exception as e:
            logger.info("translate_service_fallback", error=str(e), source=source_lang, target=target_lang)
            return text

    async def prepare_for_polly(self, text: str, language: str) -> tuple[str, str]:
        """
        Prepares text and voice for Polly:
        If language is natively supported (hi, en), returns (text, language).
        Otherwise translates to Hindi for Indian accent voice synthesis.
        """
        if is_polly_supported(language):
            return text, language

        target = get_translate_target(language)
        translated = await self.translate_text(text, source_lang=language, target_lang=target)
        return translated, target


translate_service = TranslateService()
