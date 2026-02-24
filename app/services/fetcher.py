from __future__ import annotations

import logging
import math
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from urllib.parse import urlparse
from html import unescape
from typing import Any, Dict, List, Optional, Tuple

import feedparser
import httpx
from bs4 import BeautifulSoup
from dateutil import parser as date_parser

from app.services.db import get_or_create_source, insert_item, now_utc_iso
from app.services.translator import translate_text_with_meta

RSS_SOURCES = [
    {
        "name": "RIA Novosti",
        "url": os.environ.get("FEED_RIA", "https://ria.ru/export/rss2/archive/index.xml"),
        "lang": "RU",
    },
    {
        "name": "Interfax",
        "url": os.environ.get("FEED_INTERFAX", "https://www.interfax.ru/rss.asp"),
        "lang": "RU",
    },
    {
        "name": "The Moscow Times (RU)",
        "url": os.environ.get("FEED_MOSCOWTIMES", "https://ru.themoscowtimes.com/rss/news"),
        "lang": "RU",
    },
    {
        "name": "TASS",
        "url": os.environ.get("FEED_TASS", "https://tass.com/rss/v2.xml"),
        "lang": None,
    },
    {
        "name": "Hydrometcenter Weather",
        "url": os.environ.get("FEED_HYDROMET_WEATHER", "https://meteoinfo.ru/novosti?format=feed&type=rss"),
        "lang": "RU",
    },
    {
        "name": "Google News Weather (Moscow)",
        "url": os.environ.get(
            "FEED_GOOGLE_WEATHER_MOSCOW",
            "https://news.google.com/rss/search?q=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0%20%D0%BF%D0%BE%D0%B3%D0%BE%D0%B4%D0%B0&hl=ru&gl=RU&ceid=RU:ru",
        ),
        "lang": "RU",
    },
    {
        "name": "Google News Weather (Russia)",
        "url": os.environ.get(
            "FEED_GOOGLE_WEATHER_RUSSIA",
            "https://news.google.com/rss/search?q=%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F%20%D0%BF%D0%BE%D0%B3%D0%BE%D0%B4%D0%B0&hl=ru&gl=RU&ceid=RU:ru",
        ),
        "lang": "RU",
    },
]

VC_RSS_SOURCE = {
    "name": "VC.RU",
    "url": os.environ.get("FEED_VC_RU", "https://vc.ru/rss"),
    "lang": "RU",
    # vc.ru는 보조 소스이므로 기본 점수를 낮춰 메인 러시아 RSS를 우선 노출.
    "score_adjust": -6.0,
}

TELEGRAM_SOURCES = [
    {
        "name": "Первый Московский",
        "channel": os.environ.get("TG_CHANNEL_MOSGURU", "mosguru"),
        "lang": "RU",
    },
    {
        "name": "Москвач+",
        "channel": os.environ.get("TG_CHANNEL_MOSCOWACH", "moscowach"),
        "lang": "RU",
    },
]

HTTP_TIMEOUT = float(os.environ.get("NEWS_FETCH_TIMEOUT", "2"))
FAST_FETCH_TIMEOUT = float(os.environ.get("FAST_FETCH_TIMEOUT", "1.5"))
RSS_ENTRY_LIMIT = int(os.environ.get("RSS_ENTRY_LIMIT", "12"))
TELEGRAM_ENTRY_LIMIT = int(os.environ.get("TELEGRAM_ENTRY_LIMIT", "12"))
INLINE_TRANSLATION_LIMIT = int(os.environ.get("INLINE_TRANSLATION_LIMIT", "40"))
ENABLE_TELEGRAM_SOURCE = os.environ.get("ENABLE_TELEGRAM_SOURCE", "0").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
ENABLE_VC_SOURCE = os.environ.get("ENABLE_VC_SOURCE", "0").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
VC_ENTRY_LIMIT = int(os.environ.get("VC_ENTRY_LIMIT", "8"))
FETCH_WORKERS = max(1, int(os.environ.get("NEWS_FETCH_WORKERS", "3")))
logger = logging.getLogger(__name__)

POLITICS_KEYWORDS = [
    "кремл",
    "президент",
    "путин",
    "дум",
    "госдум",
    "депутат",
    "санкц",
    "войн",
    "нато",
    "оон",
    "es ",
    "eu ",
    "ukraine",
    "zelensky",
    "politic",
    "election",
    "government",
    "parliament",
    "minister",
    "party",
    "정치",
    "대통령",
    "국회",
    "선거",
    "정부",
]

TOPIC_KEYWORDS = {
    "정치": [
        "кремл",
        "президент",
        "путин",
        "дум",
        "госдум",
        "депутат",
        "санкц",
        "войн",
        "нато",
        "оон",
        "ukraine",
        "zelensky",
        "politic",
        "election",
        "government",
        "parliament",
        "minister",
        "party",
        "정치",
        "대통령",
        "국회",
        "선거",
        "정부",
    ],
    "날씨": [
        "погод",
        "метео",
        "снег",
        "метел",
        "гололед",
        "мороз",
        "дожд",
        "ливн",
        "шторм",
        "циклон",
        "ветер",
        "температур",
        "жара",
        "синоптик",
        "прогноз",
        "weather",
        "forecast",
        "storm",
        "snow",
        "rain",
        "wind",
        "temperature",
    ],
    "경제": [
        "эконом",
        "финанс",
        "банк",
        "рубл",
        "инфляц",
        "бизнес",
        "рынок",
        "бюджет",
        "налог",
        "торгов",
        "инвест",
        "зарплат",
        "ипотек",
        "econom",
        "finance",
        "market",
        "bank",
        "inflation",
        "business",
        "investment",
        "budget",
        "tax",
        "salary",
    ],
    "문화": [
        "культур",
        "музей",
        "театр",
        "кино",
        "фестиваль",
        "концерт",
        "выставк",
        "искусств",
        "литератур",
        "fashion",
        "culture",
        "museum",
        "theatre",
        "cinema",
        "festival",
        "concert",
        "art",
    ],
    "사회": [
        "город",
        "москв",
        "метро",
        "школ",
        "универс",
        "больниц",
        "здоров",
        "жкх",
        "дорож",
        "транспорт",
        "жиль",
        "пожар",
        "community",
        "society",
        "city",
        "education",
        "health",
        "transport",
        "housing",
    ],
}

MOSCOW_KEYWORDS = [
    "москв",
    "москов",
    "мкад",
    "подмосков",
    "комсомольск",
    "moscow",
    "moskva",
]

PROMOTION_KEYWORDS = [
    "реклама",
    "партнерский",
    "промокод",
    "скидк",
    "подписывайтесь",
    "подпишись",
    "ad:",
    "advertisement",
]

VC_BLOCKED_PATH_PREFIXES = {
    "politics",
    "crypto",
    "invest",
    "apple",
    "ai",
    "opinion",
}

VC_PATH_TOPIC_HINTS = {
    "money": "경제",
    "marketplace": "경제",
    "business": "경제",
    "transport": "사회",
    "social": "사회",
    "services": "사회",
    "life": "문화",
    "travel": "문화",
    "food": "문화",
    "culture": "문화",
    "weather": "날씨",
}


def _new_translation_stats(limit: int = INLINE_TRANSLATION_LIMIT) -> Dict[str, int]:
    return {
        "attempted": 0,
        "success": 0,
        "failed": 0,
        "skipped": 0,
        "limit": max(0, int(limit)),
    }


def _merge_translation_stats(total: Dict[str, Any], part: Dict[str, Any]) -> None:
    for key in ("attempted", "success", "failed", "skipped"):
        total[key] = int(total.get(key) or 0) + int(part.get(key) or 0)


def _split_translation_budget(job_count: int, total_limit: int) -> List[int]:
    if job_count <= 0:
        return []
    if total_limit <= 0:
        return [0] * job_count
    base = total_limit // job_count
    remain = total_limit % job_count
    return [base + (1 if idx < remain else 0) for idx in range(job_count)]


def _strip_html(text: Optional[str]) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"<[^>]+>", " ", text)
    cleaned = unescape(cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def summarize_text(text: Optional[str], max_sentences: int = 3, max_chars: int = 420) -> str:
    cleaned = _strip_html(text)
    if not cleaned:
        return ""
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return cleaned[:max_chars]
    summary = " ".join(sentences[:max_sentences])
    if len(summary) > max_chars:
        summary = summary[:max_chars].rsplit(" ", 1)[0] + "…"
    return summary


def _parse_datetime(value: Optional[str]) -> str:
    if value:
        try:
            dt = date_parser.parse(value)
            if not dt.tzinfo:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except Exception:
            pass
    return datetime.now(timezone.utc).isoformat()


def _normalize_for_match(*parts: str) -> str:
    joined = " ".join(part for part in parts if part)
    lowered = joined.lower()
    lowered = lowered.replace("ё", "е")
    return lowered


def _is_political(text: str) -> bool:
    return any(keyword in text for keyword in POLITICS_KEYWORDS)


def _is_promotional(text: str) -> bool:
    return any(keyword in text for keyword in PROMOTION_KEYWORDS)


def _vc_path_segment(link: str) -> str:
    try:
        parsed = urlparse(link)
        parts = [part for part in parsed.path.split("/") if part]
        if not parts:
            return ""
        return parts[0].strip().lower()
    except Exception:
        return ""


def _is_vc_personal_blog(link: str) -> bool:
    segment = _vc_path_segment(link)
    return segment.startswith("id")


def _should_skip_vc_item(link: str) -> bool:
    segment = _vc_path_segment(link)
    if not segment:
        return False
    if segment in VC_BLOCKED_PATH_PREFIXES:
        return True
    if _is_vc_personal_blog(link):
        return True
    return False


def _vc_topic_hint(link: str) -> Optional[str]:
    segment = _vc_path_segment(link)
    if not segment:
        return None
    return VC_PATH_TOPIC_HINTS.get(segment)


def _detect_topic(text: str, source_kind: str) -> Optional[str]:
    scores = {topic: 0 for topic in TOPIC_KEYWORDS}
    for topic, keywords in TOPIC_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text:
                scores[topic] += 1

    best_topic = max(scores, key=scores.get)
    if scores[best_topic] > 0:
        return best_topic

    # Telegram 모스크바 채널은 지역 생활성 정보 비중이 높아 사회로 기본 분류.
    if source_kind == "telegram":
        return "사회"
    return None


def _is_moscow_related(text: str, source_name: str, source_kind: str) -> bool:
    if source_kind == "telegram" and "моск" in source_name.lower():
        return True
    return any(keyword in text for keyword in MOSCOW_KEYWORDS)


def _parse_compact_number(value: str) -> int:
    if not value:
        return 0
    normalized = value.strip().upper().replace(" ", "")
    normalized = normalized.replace(",", ".")
    multiplier = 1
    if normalized.endswith("K"):
        multiplier = 1_000
        normalized = normalized[:-1]
    elif normalized.endswith("M"):
        multiplier = 1_000_000
        normalized = normalized[:-1]
    elif normalized.endswith("B"):
        multiplier = 1_000_000_000
        normalized = normalized[:-1]

    try:
        return int(float(normalized) * multiplier)
    except ValueError:
        digits = re.sub(r"\D", "", value)
        return int(digits) if digits else 0


def _compute_quality_score(
    *,
    published_at: str,
    topic: str,
    source_kind: str,
    is_moscow: bool,
    views_count: int,
) -> float:
    score = 0.0
    if topic == "정치":
        score += 5.5
    elif topic == "경제":
        score += 6
    elif topic == "날씨":
        score += 6
    elif topic == "문화":
        score += 5
    else:
        score += 4

    if is_moscow:
        score += 12
    if source_kind == "telegram":
        score += 8

    if views_count > 0:
        score += min(12.0, math.log10(views_count + 1) * 2.0)

    try:
        published_dt = date_parser.parse(published_at)
        if not published_dt.tzinfo:
            published_dt = published_dt.replace(tzinfo=timezone.utc)
        age_hours = (datetime.now(timezone.utc) - published_dt.astimezone(timezone.utc)).total_seconds() / 3600
        freshness = max(0.0, 72.0 - age_hours) * 0.2
        score += freshness
    except Exception:
        score += 2

    return round(score, 2)


def _http_get(url: str, timeout: Optional[float] = None) -> Optional[str]:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; PicnicTodayBot/1.0)",
        "Accept-Language": "ru,en;q=0.8,ko;q=0.6",
    }
    try:
        with httpx.Client(timeout=timeout or HTTP_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            return resp.text
    except Exception:
        return None


def _translate_with_stats(
    text: Optional[str],
    source_lang: Optional[str],
    stats: Dict[str, Any],
) -> Optional[str]:
    if not text or not text.strip():
        return text
    if bool(stats.get("disable_inline_translation")):
        stats["skipped"] = int(stats.get("skipped") or 0) + 1
        return text
    translate_limit = max(0, int(stats.get("limit") if stats.get("limit") is not None else INLINE_TRANSLATION_LIMIT))
    if stats["attempted"] >= translate_limit:
        stats["skipped"] += 1
        return text
    translated, ok = translate_text_with_meta(text, source_lang=source_lang)
    stats["attempted"] += 1
    if ok:
        stats["success"] += 1
    else:
        stats["failed"] += 1
    return translated


def _extract_rss_items(
    feed: Dict[str, Any],
    translation_stats: Dict[str, Any],
    *,
    entry_limit: int = RSS_ENTRY_LIMIT,
    timeout: Optional[float] = None,
    translate_summary: bool = True,
) -> List[Dict[str, Any]]:
    xml = _http_get(feed["url"], timeout=timeout)
    if not xml:
        return []

    parsed = feedparser.parse(xml)
    source_id = get_or_create_source(feed["name"], feed["url"])
    items: List[Dict[str, Any]] = []

    is_vc_source = feed.get("name") == "VC.RU"
    effective_entry_limit = entry_limit
    if is_vc_source:
        effective_entry_limit = min(entry_limit, VC_ENTRY_LIMIT)

    for entry in parsed.entries[:effective_entry_limit]:
        title = _strip_html(entry.get("title") or "")
        link = entry.get("link") or ""
        if not title or not link:
            continue

        if is_vc_source and _should_skip_vc_item(link):
            continue

        raw_summary = entry.get("summary") or entry.get("description")
        content = None
        if entry.get("content"):
            content = entry["content"][0].get("value")

        summary = summarize_text(content or raw_summary)
        published_at = _parse_datetime(
            entry.get("published") or entry.get("updated") or entry.get("created")
        )

        haystack = _normalize_for_match(title, summary, link)
        is_political = _is_political(haystack)
        is_promotional = _is_promotional(haystack)
        topic = _detect_topic(haystack, source_kind="rss")
        if is_vc_source and topic is None:
            topic = _vc_topic_hint(link)
        if topic is None:
            continue
        if is_promotional:
            continue

        is_moscow = _is_moscow_related(haystack, feed["name"], "rss")
        if is_vc_source and (not is_moscow) and topic not in {"경제", "날씨"}:
            # vc.ru는 보조 소스: 모스크바 연관성이 없으면 생활 체감도가 높은 주제만 통과.
            continue
        score = _compute_quality_score(
            published_at=published_at,
            topic=topic,
            source_kind="rss",
            is_moscow=is_moscow,
            views_count=0,
        )
        score = round(max(0.0, score + float(feed.get("score_adjust") or 0.0)), 2)

        items.append(
            {
                "source_id": source_id,
                "source_name": feed["name"],
                "source_kind": "rss",
                "title": title,
                "link": link,
                "published_at": published_at,
                "summary": summary,
                "content": _strip_html(content) if content else None,
                "category": topic,
                "topic": topic,
                "is_political": int(is_political),
                "is_moscow": int(is_moscow),
                "quality_score": score,
                "views_count": None,
                "translated_title": _translate_with_stats(title, feed["lang"], translation_stats),
                "translated_summary": (
                    _translate_with_stats(summary, feed["lang"], translation_stats) if translate_summary else summary
                ),
                "translated_content": None,
                "created_at": now_utc_iso(),
            }
        )

    return items


def _extract_telegram_items(
    source: Dict[str, Any],
    translation_stats: Dict[str, Any],
    *,
    entry_limit: int = TELEGRAM_ENTRY_LIMIT,
    timeout: Optional[float] = None,
) -> List[Dict[str, Any]]:
    channel = source["channel"].strip().lstrip("@")
    if not channel:
        return []

    url = f"https://t.me/s/{channel}"
    html = _http_get(url, timeout=timeout)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    source_id = get_or_create_source(source["name"], url)

    items: List[Dict[str, Any]] = []
    blocks = soup.select("div.tgme_widget_message")
    for block in blocks[:entry_limit]:
        post_ref = block.get("data-post")
        if not post_ref or "/" not in post_ref:
            continue

        text_el = block.select_one(".tgme_widget_message_text")
        if not text_el:
            continue

        raw_text = text_el.get_text(" ", strip=True)
        text = _strip_html(raw_text)
        if len(text) < 16:
            continue

        time_el = block.select_one("time.time")
        published_at = _parse_datetime(time_el.get("datetime") if time_el else None)

        date_anchor = block.select_one("a.tgme_widget_message_date")
        link = date_anchor.get("href") if date_anchor else f"https://t.me/{post_ref}"

        views_el = block.select_one(".tgme_widget_message_views")
        views_count = _parse_compact_number(views_el.get_text(strip=True) if views_el else "")

        summary = summarize_text(text, max_sentences=2, max_chars=280)
        title = summary[:72].rstrip(" .")
        if len(summary) > 72:
            title += "…"
        if not title:
            continue

        haystack = _normalize_for_match(title, summary)
        is_political = _is_political(haystack)
        is_promotional = _is_promotional(haystack)
        topic = _detect_topic(haystack, source_kind="telegram")
        if is_promotional or topic is None:
            continue

        is_moscow = _is_moscow_related(haystack, source["name"], "telegram")
        score = _compute_quality_score(
            published_at=published_at,
            topic=topic,
            source_kind="telegram",
            is_moscow=is_moscow,
            views_count=views_count,
        )

        items.append(
            {
                "source_id": source_id,
                "source_name": source["name"],
                "source_kind": "telegram",
                "title": title,
                "link": link,
                "published_at": published_at,
                "summary": summary,
                "content": text,
                "category": topic,
                "topic": topic,
                "is_political": int(is_political),
                "is_moscow": int(is_moscow),
                "quality_score": score,
                "views_count": views_count,
                "translated_title": _translate_with_stats(title, source["lang"], translation_stats),
                "translated_summary": summary,
                "translated_content": None,
                "created_at": now_utc_iso(),
            }
        )

    return items


def fetch_and_store(fast_mode: bool = False) -> List[int]:
    stored_ids: List[int] = []
    candidates: List[Dict[str, Any]] = []
    translation_stats: Dict[str, Any] = _new_translation_stats(INLINE_TRANSLATION_LIMIT)
    rss_entry_limit = min(RSS_ENTRY_LIMIT, 4) if fast_mode else RSS_ENTRY_LIMIT
    rss_timeout = FAST_FETCH_TIMEOUT if fast_mode else None

    jobs: List[Dict[str, Any]] = []
    rss_sources = list(RSS_SOURCES)
    if ENABLE_VC_SOURCE:
        rss_sources.append(VC_RSS_SOURCE)

    for feed in rss_sources:
        per_feed_limit = rss_entry_limit
        if feed.get("name") == "VC.RU":
            per_feed_limit = min(per_feed_limit, VC_ENTRY_LIMIT)
        jobs.append(
            {
                "kind": "rss",
                "name": feed.get("name"),
                "feed": feed,
                "entry_limit": per_feed_limit,
                "timeout": rss_timeout,
                "translate_summary": not fast_mode,
            }
        )

    if ENABLE_TELEGRAM_SOURCE:
        for source in TELEGRAM_SOURCES:
            jobs.append(
                {
                    "kind": "telegram",
                    "name": source.get("name"),
                    "source": source,
                    "entry_limit": min(TELEGRAM_ENTRY_LIMIT, 8) if fast_mode else TELEGRAM_ENTRY_LIMIT,
                    "timeout": FAST_FETCH_TIMEOUT if fast_mode else None,
                }
            )

    budgets = _split_translation_budget(len(jobs), INLINE_TRANSLATION_LIMIT)
    max_workers = min(FETCH_WORKERS, max(1, len(jobs)))
    if jobs:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_map: Dict[Any, Tuple[Dict[str, Any], Dict[str, Any]]] = {}
            for index, job in enumerate(jobs):
                stats = _new_translation_stats(budgets[index] if index < len(budgets) else 0)
                if job["kind"] == "rss":
                    future = executor.submit(
                        _extract_rss_items,
                        job["feed"],
                        stats,
                        entry_limit=job["entry_limit"],
                        timeout=job["timeout"],
                        translate_summary=job["translate_summary"],
                    )
                else:
                    future = executor.submit(
                        _extract_telegram_items,
                        job["source"],
                        stats,
                        entry_limit=job["entry_limit"],
                        timeout=job["timeout"],
                    )
                future_map[future] = (stats, job)

            for future in as_completed(future_map):
                stats, job = future_map[future]
                try:
                    items = future.result()
                except Exception:
                    logger.exception(
                        "source extraction failed: kind=%s name=%s",
                        job.get("kind"),
                        job.get("name"),
                    )
                    continue
                candidates.extend(items)
                _merge_translation_stats(translation_stats, stats)

    for item in candidates:
        inserted = insert_item(item)
        if inserted:
            stored_ids.append(inserted)

    source_counts: Dict[str, int] = {}
    for item in candidates:
        source_name = str(item.get("source_name") or "unknown")
        source_counts[source_name] = source_counts.get(source_name, 0) + 1

    logger.info(
        "fetch_and_store done: mode=%s candidates=%d inserted=%d translate_attempted=%d success=%d failed=%d skipped=%d sources=%s",
        "fast" if fast_mode else "normal",
        len(candidates),
        len(stored_ids),
        translation_stats["attempted"],
        translation_stats["success"],
        translation_stats["failed"],
        translation_stats["skipped"],
        source_counts,
    )

    return stored_ids
