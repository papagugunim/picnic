-- 러시아 뉴스 7일 아카이브 테이블
CREATE TABLE IF NOT EXISTS public.russia_news_archive (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  external_id TEXT,
  title TEXT NOT NULL,
  title_original TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  summary_original TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  source_name TEXT NOT NULL DEFAULT '',
  source_kind TEXT NOT NULL DEFAULT 'rss',
  is_moscow BOOLEAN NOT NULL DEFAULT FALSE,
  views_count INTEGER,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_russia_news_archive_published_at
  ON public.russia_news_archive (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_russia_news_archive_topic_published_at
  ON public.russia_news_archive (topic, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_russia_news_archive_source_published_at
  ON public.russia_news_archive (source_name, published_at DESC);

ALTER TABLE public.russia_news_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read russia news archive"
  ON public.russia_news_archive;

CREATE POLICY "Anyone can read russia news archive"
  ON public.russia_news_archive FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.update_russia_news_archive_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_russia_news_archive_updated_at
  ON public.russia_news_archive;

CREATE TRIGGER trigger_update_russia_news_archive_updated_at
  BEFORE UPDATE ON public.russia_news_archive
  FOR EACH ROW
  EXECUTE FUNCTION public.update_russia_news_archive_updated_at();
