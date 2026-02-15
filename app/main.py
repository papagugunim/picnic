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
    get_items,
    get_latest_batch_time,
    get_today_items,
    init_db,
    search_items,
)
from app.services.scheduler import start_scheduler, run_fetch_cycle
from app.services.retranslate import retranslate_missing

APP_TITLE = "Picnic Today - RU Live News"
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


@app.post("/api/refresh")
def refresh() -> JSONResponse:
    Thread(target=run_fetch_cycle, daemon=True).start()
    return JSONResponse({"ok": True})


@app.post("/api/retranslate")
def retranslate(limit: int = 50) -> JSONResponse:
    Thread(target=retranslate_missing, args=(limit,), daemon=True).start()
    return JSONResponse({"ok": True, "limit": limit})
