"""Language code → Polly voice + Translate target map."""

from __future__ import annotations

# Languages with native Amazon Polly TTS support
POLLY_NATIVE_VOICES: dict[str, str] = {
    "hi": "Aditi",      # Hindi
    "en": "Raveena",    # English (India)
}

# Languages that need Amazon Translate → Hindi → Polly
TRANSLATE_TO_HINDI: list[str] = [
    "pa",  # Punjabi
    "mr",  # Marathi
    "gu",  # Gujarati
    "or",  # Odia
    "kn",  # Kannada
    "ml",  # Malayalam
    "ta",  # Tamil
    "bn",  # Bengali
    "as",  # Assamese
    "ur",  # Urdu
    "te",  # Telugu
]

# All supported languages
SUPPORTED_LANGUAGES: list[str] = list(POLLY_NATIVE_VOICES.keys()) + TRANSLATE_TO_HINDI

# ISO 639-1 → language display name (for advisory prompts)
LANGUAGE_NAMES: dict[str, str] = {
    "hi": "Hindi",
    "en": "English",
    "pa": "Punjabi",
    "mr": "Marathi",
    "gu": "Gujarati",
    "or": "Odia",
    "kn": "Kannada",
    "ml": "Malayalam",
    "ta": "Tamil",
    "bn": "Bengali",
    "as": "Assamese",
    "ur": "Urdu",
    "te": "Telugu",
}

# Amazon Translate source codes (some differ from ISO 639-1)
TRANSLATE_CODES: dict[str, str] = {
    "hi": "hi",
    "en": "en",
    "pa": "pa",
    "mr": "mr",
    "gu": "gu",
    "or": "or",
    "kn": "kn",
    "ml": "ml",
    "ta": "ta",
    "bn": "bn",
    "as": "as",  # Note: Translate may map this differently
    "ur": "ur",
    "te": "te",
}


def is_polly_supported(lang: str) -> bool:
    """Whether this language has native Polly voice support."""
    return lang in POLLY_NATIVE_VOICES


def get_polly_voice(lang: str) -> str | None:
    """Return native Polly voice name, or None if translate is needed."""
    return POLLY_NATIVE_VOICES.get(lang)


def needs_translation_for_voice(lang: str) -> bool:
    """Whether this language needs to go through Translate before Polly."""
    return lang in TRANSLATE_TO_HINDI


def get_translate_target(lang: str) -> str:
    """Return Amazon Translate target language code."""
    return TRANSLATE_CODES.get(lang, "hi")
