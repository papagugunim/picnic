import logging
import os
from typing import Optional, Tuple

import httpx

DEEPL_API_URL = os.environ.get("DEEPL_API_URL", "https://api-free.deepl.com/v2/translate")
DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY")
DEEPL_TIMEOUT = float(os.environ.get("DEEPL_TIMEOUT", "12"))
logger = logging.getLogger(__name__)
_missing_key_logged = False


def _should_translate(text: Optional[str]) -> bool:
    if not text:
        return False
    return text.strip() != ""


def translate_text_with_meta(
    text: Optional[str],
    source_lang: Optional[str] = None,
    target_lang: str = "KO",
) -> Tuple[Optional[str], bool]:
    global _missing_key_logged
    if not _should_translate(text):
        return text, False
    if not DEEPL_API_KEY:
        if not _missing_key_logged:
            logger.warning("DEEPL_API_KEY is missing; translation will return original text.")
            _missing_key_logged = True
        return text, False

    payload = [("text", text), ("target_lang", target_lang)]
    if source_lang:
        payload.append(("source_lang", source_lang))

    headers = {"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"}

    try:
        with httpx.Client(timeout=DEEPL_TIMEOUT) as client:
            resp = client.post(DEEPL_API_URL, data=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            translations = data.get("translations") or []
            if translations:
                translated = translations[0].get("text") or text
                return translated, True
            logger.warning("DeepL response contained no translations. source_lang=%s", source_lang)
            return text, False
    except Exception:
        logger.exception(
            "DeepL translation failed. source_lang=%s target_lang=%s text_len=%d",
            source_lang,
            target_lang,
            len(text or ""),
        )
        return text, False


def translate_text(text: Optional[str], source_lang: Optional[str] = None, target_lang: str = "KO") -> Optional[str]:
    translated, _ = translate_text_with_meta(text, source_lang=source_lang, target_lang=target_lang)
    return translated
