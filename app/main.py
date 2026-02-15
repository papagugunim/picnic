from __future__ import annotations

import os
from threading import Lock, Thread
from datetime import datetime, timezone
from typing import Optional

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
from app.services.scheduler import start_scheduler, run_fetch_cycle
from app.services.retranslate import retranslate_missing, retranslate_until_stable

APP_TITLE = "Picnic Today - RU Live News"
ADMIN_PANEL_KEY = os.environ.get("ADMIN_PANEL_KEY", "").strip()
_warmup_lock = Lock()

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
    items = get_today_items(cursor=cursor, limit=limit)
    if not items and cursor is None and os.environ.get("VERCEL") == "1":
        if _warmup_lock.acquire(blocking=False):
            try:
                run_fetch_cycle()
            finally:
                _warmup_lock.release()
        items = get_today_items(cursor=cursor, limit=limit)
    if not items:
        items = get_items(cursor=cursor, limit=limit, only_batched=False)
    return JSONResponse({"items": items})


@app.get("/api/today-news")
def api_today_news(
    cursor: Optional[str] = Query(default=None),
    topic: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> JSONResponse:
    items = get_today_items(cursor=cursor, limit=limit, topic=topic)
    if not items and cursor is None and os.environ.get("VERCEL") == "1":
        if _warmup_lock.acquire(blocking=False):
            try:
                run_fetch_cycle()
            finally:
                _warmup_lock.release()
        items = get_today_items(cursor=cursor, limit=limit, topic=topic)
    return JSONResponse({"items": items})


@app.get("/api/archive")
def api_archive(
    cursor: Optional[str] = Query(default=None),
    topic: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> JSONResponse:
    items = get_archive_items(cursor=cursor, limit=limit, topic=topic)
    return JSONResponse({"items": items})


@app.get("/api/search")
def api_search(
    q: str = Query(min_length=1),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> JSONResponse:
    items = search_items(query=q, cursor=cursor, limit=limit)
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
    return JSONResponse({"ok": True, "mode": "sync", "pending_translation_items": pending, **retranslate_result})


@app.post("/api/retranslate")
def retranslate(request: Request, limit: int = 50) -> JSONResponse:
    if not _is_admin_authorized(request):
        return JSONResponse({"ok": False, "error": "forbidden"}, status_code=403)
    if limit <= 0:
        result = retranslate_until_stable(batch_limit=120, max_rounds=8)
    else:
        result = retranslate_missing(limit)
    return JSONResponse({"ok": True, "limit": limit, **result, "mode": "sync"})
