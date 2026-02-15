from __future__ import annotations

from app.services.db import get_raw_items_missing_translation, update_translation
from app.services.translator import translate_text


def retranslate_missing(limit: int = 50) -> int:
    items = get_raw_items_missing_translation(limit)
    count = 0
    for item in items:
        title = item.get("title") or ""
        summary = item.get("summary") or ""
        t_title = translate_text(title)
        t_summary = translate_text(summary)
        update_translation(item["id"], t_title, t_summary, item.get("translated_content"))
        count += 1
    return count
