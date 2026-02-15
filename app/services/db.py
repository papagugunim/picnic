import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _default_db_path() -> str:
    # Vercel serverless filesystem is read-only except /tmp.
    if os.environ.get("VERCEL") == "1":
        return "/tmp/news.db"
    return os.path.join(BASE_DIR, "..", "..", "data", "news.db")


DB_PATH = os.environ.get("NEWS_DB_PATH", _default_db_path())


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _column_names(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}


def _ensure_columns(conn: sqlite3.Connection, table: str, columns: Iterable[tuple[str, str]]) -> None:
    existing = _column_names(conn, table)
    for name, ddl in columns:
        if name not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")


def init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with _connect() as conn:
        conn.executescript(
            """
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                link TEXT NOT NULL UNIQUE,
                published_at TEXT NOT NULL,
                summary TEXT,
                content TEXT,
                category TEXT,
                translated_title TEXT,
                translated_summary TEXT,
                translated_content TEXT,
                batch_id INTEGER,
                created_at TEXT NOT NULL,
                FOREIGN KEY(source_id) REFERENCES sources(id),
                FOREIGN KEY(batch_id) REFERENCES batches(id)
            );
            """
        )

        _ensure_columns(
            conn,
            "items",
            [
                ("category", "TEXT"),
                ("source_name", "TEXT"),
                ("source_kind", "TEXT DEFAULT 'rss'"),
                ("topic", "TEXT"),
                ("is_political", "INTEGER DEFAULT 0"),
                ("is_moscow", "INTEGER DEFAULT 0"),
                ("quality_score", "REAL DEFAULT 0"),
                ("views_count", "INTEGER"),
            ],
        )

        # 기존 데이터 호환: topic이 비어 있으면 category를 복사.
        conn.execute(
            """
            UPDATE items
            SET topic = category
            WHERE (topic IS NULL OR topic = '') AND category IS NOT NULL
            """
        )

        conn.executescript(
            """
            CREATE INDEX IF NOT EXISTS idx_items_published_at ON items(published_at DESC);
            CREATE INDEX IF NOT EXISTS idx_items_batch_id ON items(batch_id);
            CREATE INDEX IF NOT EXISTS idx_items_topic ON items(topic);
            CREATE INDEX IF NOT EXISTS idx_items_is_political ON items(is_political);
            CREATE INDEX IF NOT EXISTS idx_items_quality_score ON items(quality_score DESC);
            """
        )


def get_or_create_source(name: str, url: str) -> int:
    with _connect() as conn:
        cur = conn.execute("SELECT id FROM sources WHERE url = ?", (url,))
        row = cur.fetchone()
        if row:
            return int(row["id"])
        cur = conn.execute("INSERT INTO sources (name, url) VALUES (?, ?)", (name, url))
        return int(cur.lastrowid)


def create_batch(run_at: str) -> int:
    with _connect() as conn:
        cur = conn.execute("INSERT INTO batches (run_at) VALUES (?)", (run_at,))
        return int(cur.lastrowid)


def insert_item(item: Dict[str, Any]) -> Optional[int]:
    with _connect() as conn:
        try:
            cur = conn.execute(
                """
                INSERT INTO items (
                    source_id, source_name, source_kind,
                    title, link, published_at,
                    summary, content, category, topic,
                    is_political, is_moscow, quality_score, views_count,
                    translated_title, translated_summary, translated_content,
                    batch_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["source_id"],
                    item.get("source_name"),
                    item.get("source_kind", "rss"),
                    item["title"],
                    item["link"],
                    item["published_at"],
                    item.get("summary"),
                    item.get("content"),
                    item.get("category"),
                    item.get("topic") or item.get("category"),
                    int(item.get("is_political") or 0),
                    int(item.get("is_moscow") or 0),
                    float(item.get("quality_score") or 0),
                    item.get("views_count"),
                    item.get("translated_title"),
                    item.get("translated_summary"),
                    item.get("translated_content"),
                    item.get("batch_id"),
                    item["created_at"],
                ),
            )
            return int(cur.lastrowid)
        except sqlite3.IntegrityError:
            return None


def assign_batch_to_items(item_ids: List[int], batch_id: int) -> None:
    if not item_ids:
        return
    with _connect() as conn:
        conn.executemany(
            "UPDATE items SET batch_id = ? WHERE id = ?",
            [(batch_id, item_id) for item_id in item_ids],
        )


def get_latest_batch_time() -> Optional[str]:
    with _connect() as conn:
        cur = conn.execute("SELECT run_at FROM batches ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        return row["run_at"] if row else None


def _row_to_item(row: sqlite3.Row) -> Dict[str, Any]:
    topic = row["topic"] or row["category"]
    return {
        "id": row["id"],
        "title": row["translated_title"] or row["title"],
        "title_original": row["title"],
        "summary": row["translated_summary"] or row["summary"],
        "summary_original": row["summary"],
        "content": row["translated_content"] or row["content"],
        "content_original": row["content"],
        "link": row["link"],
        "published_at": row["published_at"],
        "category": topic,
        "topic": topic,
        "source_name": row["source_name"],
        "source_kind": row["source_kind"] or "rss",
        "is_political": bool(row["is_political"] or 0),
        "is_moscow": bool(row["is_moscow"] or 0),
        "quality_score": float(row["quality_score"] or 0),
        "views_count": row["views_count"],
        "batch_id": row["batch_id"],
    }


def get_raw_items_missing_translation(limit: int) -> List[Dict[str, Any]]:
    with _connect() as conn:
        cur = conn.execute(
            """
            SELECT id, title, summary, content, translated_title, translated_summary, translated_content
            FROM items
            WHERE translated_title IS NULL OR translated_summary IS NULL
            ORDER BY published_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cur.fetchall()
        return [dict(row) for row in rows]


def update_translation(
    item_id: int,
    translated_title: Optional[str],
    translated_summary: Optional[str],
    translated_content: Optional[str],
) -> None:
    with _connect() as conn:
        conn.execute(
            """
            UPDATE items
            SET translated_title = ?, translated_summary = ?, translated_content = ?
            WHERE id = ?
            """,
            (translated_title, translated_summary, translated_content, item_id),
        )


def get_items(cursor: Optional[str], limit: int, only_batched: bool = True) -> List[Dict[str, Any]]:
    with _connect() as conn:
        if cursor:
            if only_batched:
                cur = conn.execute(
                    """
                    SELECT * FROM items
                    WHERE batch_id IS NOT NULL AND published_at < ?
                    ORDER BY published_at DESC
                    LIMIT ?
                    """,
                    (cursor, limit),
                )
            else:
                cur = conn.execute(
                    """
                    SELECT * FROM items
                    WHERE published_at < ?
                    ORDER BY published_at DESC
                    LIMIT ?
                    """,
                    (cursor, limit),
                )
        else:
            if only_batched:
                cur = conn.execute(
                    """
                    SELECT * FROM items
                    WHERE batch_id IS NOT NULL
                    ORDER BY published_at DESC
                    LIMIT ?
                    """,
                    (limit,),
                )
            else:
                cur = conn.execute(
                    """
                    SELECT * FROM items
                    ORDER BY published_at DESC
                    LIMIT ?
                    """,
                    (limit,),
                )
        rows = cur.fetchall()
        return [_row_to_item(row) for row in rows]


def get_today_items(cursor: Optional[str], limit: int, topic: Optional[str] = None) -> List[Dict[str, Any]]:
    def _query(conn: sqlite3.Connection, only_batched: bool) -> List[sqlite3.Row]:
        allowed_topics = ("사회", "경제", "문화")
        params: List[Any] = []

        base_sql = (
            "SELECT * FROM items "
            "WHERE is_political = 0 "
            "AND topic IN (?, ?, ?) "
            "AND source_name IS NOT NULL "
        )
        params.extend(allowed_topics)

        if only_batched:
            base_sql += "AND batch_id IS NOT NULL "

        if topic in allowed_topics:
            base_sql += "AND topic = ? "
            params.append(topic)

        if cursor:
            base_sql += "AND published_at < ? "
            params.append(cursor)

        base_sql += "ORDER BY published_at DESC, quality_score DESC LIMIT ?"
        params.append(limit)
        return conn.execute(base_sql, tuple(params)).fetchall()

    with _connect() as conn:
        rows = _query(conn, only_batched=True)
        if not rows:
            rows = _query(conn, only_batched=False)
        return [_row_to_item(row) for row in rows]


def get_unbatched_items(limit: int) -> List[Dict[str, Any]]:
    with _connect() as conn:
        cur = conn.execute(
            """
            SELECT * FROM items
            WHERE batch_id IS NULL
            ORDER BY published_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cur.fetchall()
        return [_row_to_item(row) for row in rows]


def search_items(query: str, cursor: Optional[str], limit: int) -> List[Dict[str, Any]]:
    like = f"%{query}%"
    with _connect() as conn:
        if cursor:
            cur = conn.execute(
                """
                SELECT * FROM items
                WHERE published_at < ? AND (
                    title LIKE ? OR summary LIKE ? OR content LIKE ? OR
                    translated_title LIKE ? OR translated_summary LIKE ? OR translated_content LIKE ?
                )
                ORDER BY published_at DESC
                LIMIT ?
                """,
                (cursor, like, like, like, like, like, like, limit),
            )
        else:
            cur = conn.execute(
                """
                SELECT * FROM items
                WHERE title LIKE ? OR summary LIKE ? OR content LIKE ? OR
                      translated_title LIKE ? OR translated_summary LIKE ? OR translated_content LIKE ?
                ORDER BY published_at DESC
                LIMIT ?
                """,
                (like, like, like, like, like, like, limit),
            )
        rows = cur.fetchall()
        return [_row_to_item(row) for row in rows]


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
