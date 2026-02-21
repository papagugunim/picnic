import { cache } from '@/lib/cache/memoryCache'
import { normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'

type CacheScope = 'today' | 'archive'

interface CachedNewsEntry {
  items: RussiaNewsItem[]
  savedAt: number
}

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60
const ARCHIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ITEMS_PER_SCOPE = 500

function toSafeLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 20
  return Math.min(Math.floor(limit), 50)
}

function buildKey(scope: CacheScope, topic: RussiaNewsTopic): string {
  return `russia-news:${scope}:${topic || 'all'}`
}

function parsePublishedAtMs(value: string): number {
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

function filterByTopic(items: RussiaNewsItem[], topic: RussiaNewsTopic): RussiaNewsItem[] {
  if (!topic) return items
  return items.filter((item) => normalizeTopic(item.topic || null) === topic)
}

function clip(items: RussiaNewsItem[], limit: number): RussiaNewsItem[] {
  return items.slice(0, toSafeLimit(limit))
}

function sortByPublishedAtDesc(items: RussiaNewsItem[]): RussiaNewsItem[] {
  return [...items].sort((a, b) => parsePublishedAtMs(b.published_at) - parsePublishedAtMs(a.published_at))
}

function keepRecentWindow(items: RussiaNewsItem[]): RussiaNewsItem[] {
  const minTime = Date.now() - ARCHIVE_WINDOW_MS
  return items.filter((item) => {
    const publishedAt = parsePublishedAtMs(item.published_at)
    return publishedAt > 0 && publishedAt >= minTime
  })
}

function dedupeByStableKey(items: RussiaNewsItem[]): RussiaNewsItem[] {
  const map = new Map<string, RussiaNewsItem>()
  for (const item of items) {
    if (item.source_name === 'picnic-fallback') continue
    const key = `${item.id}|${item.published_at}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  }
  return Array.from(map.values())
}

function mergeAndPrune(existing: RussiaNewsItem[], next: RussiaNewsItem[]): RussiaNewsItem[] {
  const merged = dedupeByStableKey([...existing, ...next])
  const recentOnly = keepRecentWindow(merged)
  const sorted = sortByPublishedAtDesc(recentOnly)
  return sorted.slice(0, MAX_ITEMS_PER_SCOPE)
}

export function writeCachedRussiaNews(scope: CacheScope, topicInput: string | null, items: RussiaNewsItem[]): void {
  if (!Array.isArray(items) || items.length === 0) return

  const topic = normalizeTopic(topicInput)
  const key = buildKey(scope, topic)
  const existing = cache.get<CachedNewsEntry>(key)?.items || []
  const mergedItems = mergeAndPrune(existing, items)
  if (mergedItems.length === 0) return

  const entry: CachedNewsEntry = {
    items: mergedItems,
    savedAt: Date.now(),
  }

  cache.set(key, entry, CACHE_TTL_SECONDS)

  // 전체 캐시는 토픽 캐시를 합쳐 유지한다.
  const allKey = buildKey(scope, '')
  const existingAll = cache.get<CachedNewsEntry>(allKey)?.items || []
  const mergedAllItems = mergeAndPrune(existingAll, mergedItems)
  if (mergedAllItems.length > 0) {
    cache.set(
      allKey,
      {
        items: mergedAllItems,
        savedAt: Date.now(),
      },
      CACHE_TTL_SECONDS
    )
  }
}

export function readCachedRussiaNews(
  scope: CacheScope,
  topicInput: string | null,
  limit: number,
  cursor: string | null = null
): RussiaNewsItem[] {
  const topic = normalizeTopic(topicInput)
  const safeLimit = toSafeLimit(limit)
  const cursorMs = cursor ? parsePublishedAtMs(cursor) : 0
  const applyCursor = (items: RussiaNewsItem[]) => {
    if (!cursorMs) return items
    return items.filter((item) => parsePublishedAtMs(item.published_at) < cursorMs)
  }

  const specific = cache.get<CachedNewsEntry>(buildKey(scope, topic))
  if (specific?.items?.length) {
    const filtered = applyCursor(filterByTopic(specific.items, topic))
    return clip(sortByPublishedAtDesc(filtered), safeLimit)
  }

  const allEntry = cache.get<CachedNewsEntry>(buildKey(scope, ''))
  if (allEntry?.items?.length) {
    const filtered = applyCursor(filterByTopic(allEntry.items, topic))
    return clip(sortByPublishedAtDesc(filtered), safeLimit)
  }

  return []
}
