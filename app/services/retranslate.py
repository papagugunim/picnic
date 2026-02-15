from __future__ import annotations

import logging
import re
from typing import Dict

from app.services.db import count_pending_translations, get_raw_items_missing_translation, update_translation
from app.services.translator import translate_text_with_meta

logger = logging.getLogger(__name__)
_cyrillic_re = re.compile(r"[А-Яа-яЁё]")
_latin_re = re.compile(r"[A-Za-z]")


def _guess_source_lang(text: str) -> str | None:
    if _cyrillic_re.search(text):
        return "RU"
    if _latin_re.search(text):
        return "EN"
    return None


def retranslate_missing(limit: int = 50) -> Dict[str, int]:
    items = get_raw_items_missing_translation(limit)
    count = 0
    translation_attempted = 0
    translation_success = 0
    translation_failed = 0

    for item in items:
        title = item.get("title") or ""
        summary = item.get("summary") or ""
        source_lang = _guess_source_lang(f"{title} {summary}")

        t_title, ok_title = translate_text_with_meta(title, source_lang=source_lang)
        if title.strip():
            translation_attempted += 1
            if ok_title:
                translation_success += 1
            else:
                translation_failed += 1

        t_summary, ok_summary = translate_text_with_meta(summary, source_lang=source_lang)
        if summary.strip():
            translation_attempted += 1
            if ok_summary:
                translation_success += 1
            else:
                translation_failed += 1

        update_translation(item["id"], t_title, t_summary, item.get("translated_content"))
        count += 1

    result = {
        "processed_items": count,
        "translate_attempted": translation_attempted,
        "translate_success": translation_success,
        "translate_failed": translation_failed,
    }
    logger.info(
        "retranslate_missing done: processed=%d attempted=%d success=%d failed=%d",
        result["processed_items"],
        result["translate_attempted"],
        result["translate_success"],
        result["translate_failed"],
    )
    return result


def retranslate_until_stable(batch_limit: int = 120, max_rounds: int = 8) -> Dict[str, int]:
    total_processed = 0
    total_attempted = 0
    total_success = 0
    total_failed = 0

    for _ in range(max_rounds):
        chunk = retranslate_missing(limit=batch_limit)
        processed = chunk["processed_items"]
        total_processed += processed
        total_attempted += chunk["translate_attempted"]
        total_success += chunk["translate_success"]
        total_failed += chunk["translate_failed"]
        if processed < batch_limit:
            break

    pending = count_pending_translations()
    result = {
        "processed_items": total_processed,
        "translate_attempted": total_attempted,
        "translate_success": total_success,
        "translate_failed": total_failed,
        "remaining_pending": pending,
    }
    logger.info(
        "retranslate_until_stable done: processed=%d attempted=%d success=%d failed=%d pending=%d",
        result["processed_items"],
        result["translate_attempted"],
        result["translate_success"],
        result["translate_failed"],
        result["remaining_pending"],
    )
    return result
