from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Dict, List

from dateutil import parser as date_parser

from app.services.db import assign_batch_to_items, create_batch, get_unbatched_items

ALLOWED_TOPICS = {"사회", "경제", "문화", "날씨"}
BATCH_SIZE = int(os.environ.get("NEWS_BATCH_SIZE", "24"))


def _age_penalty(published_at: str) -> float:
    try:
        dt = date_parser.parse(published_at)
        if not dt.tzinfo:
            dt = dt.replace(tzinfo=timezone.utc)
        age_hours = (datetime.now(timezone.utc) - dt.astimezone(timezone.utc)).total_seconds() / 3600
        return max(0.0, age_hours * 0.15)
    except Exception:
        return 4.0


def _ranking_score(item: Dict[str, object]) -> float:
    score = float(item.get("quality_score") or 0)
    if item.get("is_moscow"):
        score += 6
    if item.get("source_kind") == "telegram":
        score += 3
    source_name = str(item.get("source_name") or "")
    if source_name == "VC.RU":
        # vc.ru는 보조 소스: 기본 랭킹에서 메인 RSS보다 뒤로 배치.
        score -= 6
    if item.get("topic") == "경제":
        score += 1.5
    if item.get("topic") == "날씨":
        score += 1.2
    score -= _age_penalty(str(item.get("published_at") or ""))
    return score


def select_top_news() -> None:
    candidates = get_unbatched_items(limit=320)
    filtered: List[Dict[str, object]] = []
    for item in candidates:
        if item.get("is_political"):
            continue
        if item.get("topic") not in ALLOWED_TOPICS:
            continue
        filtered.append(item)

    if not filtered:
        return

    filtered.sort(
        key=lambda item: (_ranking_score(item), str(item.get("published_at") or "")),
        reverse=True,
    )
    top = filtered[:BATCH_SIZE]
    if not top:
        return

    batch_id = create_batch(datetime.now(timezone.utc).isoformat())
    assign_batch_to_items([int(item["id"]) for item in top], batch_id)


# 이전 코드와의 호환성 유지
select_top_20 = select_top_news
