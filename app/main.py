from __future__ import annotations

import os
import time
from threading import Lock, Thread
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from fastapi import FastAPI, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.services.db import (
    get_archive_items,
    count_pending_translations,
    get_items,
    get_latest_batch_time,
    get_today_items,
    get_admin_metrics,
    init_db,
    search_items,
)
from app.services.scheduler import run_fast_bootstrap_cycle, start_scheduler, run_fetch_cycle
from app.services.retranslate import retranslate_missing, retranslate_until_stable

APP_TITLE = "Picnic Today - RU Live News"
ADMIN_PANEL_KEY = os.environ.get("ADMIN_PANEL_KEY", "").strip()
_warmup_lock = Lock()
_cache_lock = Lock()
API_CACHE_TTL_SECONDS = max(5, int(os.environ.get("API_CACHE_TTL_SECONDS", "45")))
_api_cache: Dict[Tuple[str, str, str, str, int], Tuple[float, list[dict[str, Any]]]] = {}

app = FastAPI(title=APP_TITLE)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

templates = Jinja2Templates(directory=TEMPLATES_DIR)


@app.on_event("startup")
def _startup() -> None:
    init_db()
    start_scheduler()
    # Run once at startup without blocking app boot
    Thread(target=run_fetch_cycle, daemon=True).start()


def _run_warmup_cycle() -> None:
    try:
        run_fast_bootstrap_cycle()
    finally:
        _warmup_lock.release()


def _run_warmup_once() -> None:
    if not _warmup_lock.acquire(blocking=False):
        return
    _run_warmup_cycle()


def _cache_headers() -> Dict[str, str]:
    return {
        "Cache-Control": f"public, max-age={API_CACHE_TTL_SECONDS}, stale-while-revalidate=120",
    }


def _cache_key(route: str, cursor: Optional[str], topic: Optional[str], query: Optional[str], limit: int) -> Tuple[str, str, str, str, int]:
    return (route, cursor or "", topic or "", query or "", limit)


def _get_cached_items(key: Tuple[str, str, str, str, int]) -> Optional[list[dict[str, Any]]]:
    now = time.monotonic()
    with _cache_lock:
        entry = _api_cache.get(key)
        if not entry:
            return None
        expires_at, items = entry
        if expires_at < now:
            _api_cache.pop(key, None)
            return None
        return items


def _set_cached_items(key: Tuple[str, str, str, str, int], items: list[dict[str, Any]]) -> None:
    with _cache_lock:
        _api_cache[key] = (time.monotonic() + API_CACHE_TTL_SECONDS, items)


def _clear_cache() -> None:
    with _cache_lock:
        _api_cache.clear()


@app.get("/", response_class=HTMLResponse)
def home(request: Request) -> HTMLResponse:
    latest_run = get_latest_batch_time()
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "latest_run": latest_run,
            "app_title": APP_TITLE,
        },
    )


@app.get("/search", response_class=HTMLResponse)
def search_page(request: Request, q: str = "") -> HTMLResponse:
    latest_run = get_latest_batch_time()
    return templates.TemplateResponse(
        "search.html",
        {
            "request": request,
            "latest_run": latest_run,
            "app_title": APP_TITLE,
            "query": q,
        },
    )


def _is_admin_authorized(request: Request) -> bool:
    if not ADMIN_PANEL_KEY:
        return True
    query_key = request.query_params.get("key", "")
    header_key = request.headers.get("x-admin-key", "")
    return query_key == ADMIN_PANEL_KEY or header_key == ADMIN_PANEL_KEY


@app.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request) -> HTMLResponse:
    if not _is_admin_authorized(request):
        return HTMLResponse("Forbidden", status_code=403)

    latest_run = get_latest_batch_time()
    metrics = get_admin_metrics()
    return templates.TemplateResponse(
        "admin.html",
        {
            "request": request,
            "latest_run": latest_run,
            "app_title": APP_TITLE,
            "metrics": metrics,
            "admin_key_required": bool(ADMIN_PANEL_KEY),
        },
    )


@app.get("/api/feed")
def api_feed(
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> JSONResponse:
    key = _cache_key("feed", cursor=cursor, topic=None, query=None, limit=limit)
    if cursor is None:
        cached = _get_cached_items(key)
        if cached is not None:
            return JSONResponse({"items": cached}, headers=_cache_headers())

    items = get_today_items(cursor=cursor, limit=limit)
    if not items and cursor is None and os.environ.get("VERCEL") == "1":
        _run_warmup_once()
        items = get_today_items(cursor=cursor, limit=limit)
    if not items:
        items = get_items(cursor=cursor, limit=limit, only_batched=False, source_kind="rss")
    if not items:
        items = get_archive_items(cursor=cursor, limit=limit)
    if cursor is None:
        _set_cached_items(key, items)
        return JSONResponse({"items": items}, headers=_cache_headers())
    return JSONResponse({"items": items})


@app.get("/api/today-news")
def api_today_news(
    cursor: Optional[str] = Query(default=None),
    topic: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> JSONResponse:
    key = _cache_key("today-news", cursor=cursor, topic=topic, query=None, limit=limit)
    if cursor is None:
        cached = _get_cached_items(key)
        if cached is not None:
            return JSONResponse({"items": cached}, headers=_cache_headers())

    items = get_today_items(cursor=cursor, limit=limit, topic=topic)
    if not items and cursor is None and os.environ.get("VERCEL") == "1":
        _run_warmup_once()
        items = get_today_items(cursor=cursor, limit=limit, topic=topic)
    if not items:
        items = get_archive_items(cursor=cursor, limit=limit, topic=topic)
    if cursor is None:
        _set_cached_items(key, items)
        return JSONResponse({"items": items}, headers=_cache_headers())
    return JSONResponse({"items": items})


@app.get("/api/archive")
def api_archive(
    cursor: Optional[str] = Query(default=None),
    topic: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> JSONResponse:
    key = _cache_key("archive", cursor=cursor, topic=topic, query=None, limit=limit)
    if cursor is None:
        cached = _get_cached_items(key)
        if cached is not None:
            return JSONResponse({"items": cached}, headers=_cache_headers())

    items = get_archive_items(cursor=cursor, limit=limit, topic=topic)
    if cursor is None:
        _set_cached_items(key, items)
        return JSONResponse({"items": items}, headers=_cache_headers())
    return JSONResponse({"items": items})


@app.get("/api/search")
def api_search(
    q: str = Query(min_length=1),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> JSONResponse:
    key = _cache_key("search", cursor=cursor, topic=None, query=q, limit=limit)
    if cursor is None:
        cached = _get_cached_items(key)
        if cached is not None:
            return JSONResponse({"items": cached}, headers=_cache_headers())

    items = search_items(query=q, cursor=cursor, limit=limit)
    if cursor is None:
        _set_cached_items(key, items)
        return JSONResponse({"items": items}, headers=_cache_headers())
    return JSONResponse({"items": items})


@app.get("/api/health")
def health() -> JSONResponse:
    return JSONResponse({"ok": True, "time": datetime.now(timezone.utc).isoformat()})


@app.get("/api/admin/metrics")
def api_admin_metrics(request: Request) -> JSONResponse:
    if not _is_admin_authorized(request):
        return JSONResponse({"ok": False, "error": "forbidden"}, status_code=403)
    return JSONResponse({"ok": True, "metrics": get_admin_metrics()})


@app.post("/api/refresh")
def refresh(request: Request) -> JSONResponse:
    if not _is_admin_authorized(request):
        return JSONResponse({"ok": False, "error": "forbidden"}, status_code=403)
    run_fetch_cycle()
    retranslate_result = retranslate_until_stable(batch_limit=120, max_rounds=6)
    pending = count_pending_translations()
    _clear_cache()
    return JSONResponse({"ok": True, "mode": "sync", "pending_translation_items": pending, **retranslate_result})


@app.post("/api/retranslate")
def retranslate(request: Request, limit: int = 50) -> JSONResponse:
    if not _is_admin_authorized(request):
        return JSONResponse({"ok": False, "error": "forbidden"}, status_code=403)
    if limit <= 0:
        result = retranslate_until_stable(batch_limit=120, max_rounds=8)
    else:
        result = retranslate_missing(limit)
    _clear_cache()
    return JSONResponse({"ok": True, "limit": limit, **result, "mode": "sync"})
