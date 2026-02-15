import os
from typing import Optional

import httpx

DEEPL_API_URL = os.environ.get("DEEPL_API_URL", "https://api-free.deepl.com/v2/translate")
DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY")
DEEPL_TIMEOUT = float(os.environ.get("DEEPL_TIMEOUT", "12"))


def _should_translate(text: Optional[str]) -> bool:
    if not text:
        return False
    return text.strip() != ""


def translate_text(text: Optional[str], source_lang: Optional[str] = None, target_lang: str = "KO") -> Optional[str]:
    if not _should_translate(text):
        return text
    if not DEEPL_API_KEY:
        return text

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
                return translations[0].get("text") or text
            return text
    except Exception:
        return text
