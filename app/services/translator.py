import logging
import os
import re
from typing import Optional, Tuple

import httpx

DEEPL_API_URL = os.environ.get("DEEPL_API_URL", "https://api-free.deepl.com/v2/translate")
DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY")
DEEPL_TIMEOUT = float(os.environ.get("DEEPL_TIMEOUT", "12"))
DEEPL_RETRIES = max(1, int(os.environ.get("DEEPL_RETRIES", "2")))
logger = logging.getLogger(__name__)
_missing_key_logged = False
_cyrillic_re = re.compile(r"[А-Яа-яЁё]")
_hangul_re = re.compile(r"[가-힣]")


def _should_translate(text: Optional[str]) -> bool:
    if not text:
        return False
    return text.strip() != ""


def _looks_untranslated(source: str, translated: str) -> bool:
    if not translated:
        return True
    if _cyrillic_re.search(source):
        if _hangul_re.search(translated):
            return False
        if _cyrillic_re.search(translated):
            return True
    return False


def _request_translate(payload: dict, headers: dict) -> Optional[str]:
    with httpx.Client(timeout=DEEPL_TIMEOUT) as client:
        resp = client.post(DEEPL_API_URL, data=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        translations = data.get("translations") or []
        if not translations:
            return None
        return translations[0].get("text")


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

    headers = {"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"}

    attempts = []
    if source_lang:
        attempts.append({"text": text, "target_lang": target_lang, "source_lang": source_lang})
    attempts.append({"text": text, "target_lang": target_lang})

    last_error: Optional[Exception] = None
    for payload in attempts:
        for _ in range(DEEPL_RETRIES):
            try:
                translated = _request_translate(payload, headers)
                if not translated:
                    continue
                if _looks_untranslated(text, translated):
                    continue
                return translated, True
            except Exception as exc:
                last_error = exc

    if last_error:
        logger.error(
            "DeepL translation failed. source_lang=%s target_lang=%s text_len=%d error=%r",
            source_lang,
            target_lang,
            len(text or ""),
            last_error,
        )
    else:
        logger.warning(
            "DeepL returned untranslated content repeatedly. source_lang=%s target_lang=%s text_len=%d",
            source_lang,
            target_lang,
            len(text or ""),
        )
    return text, False


def translate_text(text: Optional[str], source_lang: Optional[str] = None, target_lang: str = "KO") -> Optional[str]:
    translated, _ = translate_text_with_meta(text, source_lang=source_lang, target_lang=target_lang)
    return translated
