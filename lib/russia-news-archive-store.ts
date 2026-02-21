import crypto from 'node:crypto'

import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'

const ARCHIVE_WINDOW_DAYS = 7
const ARCHIVE_WINDOW_MS = ARCHIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000
const UPSERT_CHUNK_SIZE = 200
const MAX_LIMIT = 50

interface RussiaNewsArchiveRow {
  dedupe_key: string
  external_id: string | null
  title: string
  title_original: string
  summary: string
  summary_original: string
  link: string
  published_at: string
  topic: string
  source_name: string
  source_kind: string
  is_moscow: boolean
  views_count: number | null
  fetched_at: string
}

interface ReadArchiveOptions {
  topic: string | null
  limit: number
  cursor?: string | null
}

interface SaveArchiveResult {
  upsertedCount: number
  prunedCount: number
}

function parsePublishedAtMs(value: string): number {
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

function getWindowStartIso(nowMs = Date.now()): string {
  return new Date(nowMs - ARCHIVE_WINDOW_MS).toISOString()
}

function toSafeLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 20
  return Math.max(1, Math.min(Math.floor(limit), MAX_LIMIT))
}

function isStorableItem(item: RussiaNewsItem): boolean {
  if (!item) return false
  if (item.source_name === 'picnic-fallback') return false
  if (!item.title?.trim()) return false
  if (!item.link?.trim()) return false
  const publishedAtMs = parsePublishedAtMs(item.published_at)
  if (!publishedAtMs) return false
  if (publishedAtMs < Date.now() - ARCHIVE_WINDOW_MS) return false
  return true
}

function buildDedupeKey(item: RussiaNewsItem): string {
  const payload = [
    item.source_name || '',
    item.source_kind || '',
    item.link || '',
    item.published_at || '',
    item.title_original || item.title || '',
  ].join('||')

  return crypto.createHash('sha256').update(payload).digest('hex')
}

function toArchiveRow(item: RussiaNewsItem, fetchedAtIso: string): RussiaNewsArchiveRow {
  const normalizedTopic = normalizeTopic(item.topic || null)
  return {
    dedupe_key: buildDedupeKey(item),
    external_id: item.id || null,
    title: item.title || item.title_original || '',
    title_original: item.title_original || item.title || '',
    summary: item.summary || '',
    summary_original: item.summary_original || item.summary || '',
    link: item.link || '',
    published_at: item.published_at,
    topic: normalizedTopic || item.topic || '',
    source_name: item.source_name || '',
    source_kind: item.source_kind || 'rss',
    is_moscow: Boolean(item.is_moscow),
    views_count: Number.isFinite(item.views_count as number) ? (item.views_count as number) : null,
    fetched_at: fetchedAtIso,
  }
}

function fromArchiveRow(row: any): RussiaNewsItem {
  return {
    id: row.external_id || row.dedupe_key,
    title: row.title,
    title_original: row.title_original,
    summary: row.summary,
    summary_original: row.summary_original,
    link: row.link,
    published_at: row.published_at,
    topic: row.topic || '',
    source_name: row.source_name || '',
    source_kind: row.source_kind || 'rss',
    is_moscow: Boolean(row.is_moscow),
    views_count: Number.isFinite(row.views_count) ? row.views_count : null,
  }
}

export async function readRussiaNewsFromArchiveStore({
  topic,
  limit,
  cursor = null,
}: ReadArchiveOptions): Promise<RussiaNewsItem[]> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return []
  }

  const normalizedTopic = normalizeTopic(topic)
  const safeLimit = toSafeLimit(limit)
  const windowStartIso = getWindowStartIso()

  let query = supabase
    .from('russia_news_archive')
    .select(
      'dedupe_key, external_id, title, title_original, summary, summary_original, link, published_at, topic, source_name, source_kind, is_moscow, views_count'
    )
    .gte('published_at', windowStartIso)
    .order('published_at', { ascending: false })
    .limit(safeLimit)

  if (normalizedTopic) {
    query = query.eq('topic', normalizedTopic)
  }

  if (cursor) {
    query = query.lt('published_at', cursor)
  }

  const { data, error } = await query
  if (error || !Array.isArray(data)) return []

  return data.map(fromArchiveRow)
}

export async function saveRussiaNewsArchiveItems(items: RussiaNewsItem[]): Promise<SaveArchiveResult> {
  const candidates = items.filter(isStorableItem)
  if (candidates.length === 0) {
    return { upsertedCount: 0, prunedCount: 0 }
  }

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return { upsertedCount: 0, prunedCount: 0 }
  }

  const fetchedAtIso = new Date().toISOString()
  const rowMap = new Map<string, RussiaNewsArchiveRow>()
  for (const item of candidates) {
    const row = toArchiveRow(item, fetchedAtIso)
    rowMap.set(row.dedupe_key, row)
  }

  const rows = Array.from(rowMap.values())
  let upsertedCount = 0

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE)
    const { error } = await supabase
      .from('russia_news_archive')
      .upsert(chunk, { onConflict: 'dedupe_key' })

    if (!error) {
      upsertedCount += chunk.length
    }
  }

  const windowStartIso = getWindowStartIso()
  const { error: pruneError, count: pruneCount } = await supabase
    .from('russia_news_archive')
    .delete({ count: 'exact' })
    .lt('published_at', windowStartIso)

  return {
    upsertedCount,
    prunedCount: pruneError ? 0 : (pruneCount || 0),
  }
}

export function getRussiaNewsArchiveWindowDays(): number {
  return ARCHIVE_WINDOW_DAYS
}

export function isInArchiveWindow(publishedAt: string): boolean {
  const publishedAtMs = parsePublishedAtMs(publishedAt)
  if (!publishedAtMs) return false
  return publishedAtMs >= Date.now() - ARCHIVE_WINDOW_MS
}

export function normalizeArchiveTopic(topic: string | null): RussiaNewsTopic {
  return normalizeTopic(topic)
}
