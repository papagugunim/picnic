from __future__ import annotations

import os

from apscheduler.schedulers.background import BackgroundScheduler

from app.services.fetcher import fetch_and_store
from app.services.ranker import select_top_news
from app.services.retranslate import retranslate_until_stable

scheduler = BackgroundScheduler()
FETCH_INTERVAL_HOURS = int(os.environ.get("FETCH_INTERVAL_HOURS", "3"))


def run_fetch_cycle() -> None:
    fetch_and_store()
    retranslate_until_stable(batch_limit=120, max_rounds=4)
    select_top_news()


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        run_fetch_cycle,
        "interval",
        hours=FETCH_INTERVAL_HOURS,
        id="fetch_cycle",
        replace_existing=True,
    )
    scheduler.start()
