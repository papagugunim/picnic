from __future__ import annotations

import logging
from typing import Dict

from app.services.db import get_raw_items_missing_translation, update_translation
from app.services.translator import translate_text_with_meta

logger = logging.getLogger(__name__)


def retranslate_missing(limit: int = 50) -> Dict[str, int]:
    items = get_raw_items_missing_translation(limit)
    count = 0
    translation_attempted = 0
    translation_success = 0
    translation_failed = 0

    for item in items:
        title = item.get("title") or ""
        summary = item.get("summary") or ""

        t_title, ok_title = translate_text_with_meta(title)
        if title.strip():
            translation_attempted += 1
            if ok_title:
                translation_success += 1
            else:
                translation_failed += 1

        t_summary, ok_summary = translate_text_with_meta(summary)
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
