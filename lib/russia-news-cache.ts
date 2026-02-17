import { cache } from '@/lib/cache/memoryCache'
import { normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'

type CacheScope = 'today' | 'archive'

interface CachedNewsEntry {
  items: RussiaNewsItem[]
  savedAt: number
}

const CACHE_TTL_SECONDS = 6 * 60 * 60

function toSafeLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 20
  return Math.min(Math.floor(limit), 50)
}

function buildKey(scope: CacheScope, topic: RussiaNewsTopic): string {
  return `russia-news:${scope}:${topic || 'all'}`
}

function filterByTopic(items: RussiaNewsItem[], topic: RussiaNewsTopic): RussiaNewsItem[] {
  if (!topic) return items
  return items.filter((item) => normalizeTopic(item.topic || null) === topic)
}

function clip(items: RussiaNewsItem[], limit: number): RussiaNewsItem[] {
  return items.slice(0, toSafeLimit(limit))
}

export function writeCachedRussiaNews(scope: CacheScope, topicInput: string | null, items: RussiaNewsItem[]): void {
  if (!Array.isArray(items) || items.length === 0) return

  const topic = normalizeTopic(topicInput)
  const entry: CachedNewsEntry = {
    items,
    savedAt: Date.now(),
  }

  cache.set(buildKey(scope, topic), entry, CACHE_TTL_SECONDS)

  // 특정 토픽 요청이어도 전체 캐시가 비어 있다면 첫 데이터셋을 보관해 fallback 폭을 넓힌다.
  const allKey = buildKey(scope, '')
  if (!cache.get<CachedNewsEntry>(allKey)) {
    cache.set(allKey, entry, CACHE_TTL_SECONDS)
  }
}

export function readCachedRussiaNews(
  scope: CacheScope,
  topicInput: string | null,
  limit: number
): RussiaNewsItem[] {
  const topic = normalizeTopic(topicInput)
  const safeLimit = toSafeLimit(limit)

  const specific = cache.get<CachedNewsEntry>(buildKey(scope, topic))
  if (specific?.items?.length) {
    return clip(filterByTopic(specific.items, topic), safeLimit)
  }

  const allEntry = cache.get<CachedNewsEntry>(buildKey(scope, ''))
  if (allEntry?.items?.length) {
    return clip(filterByTopic(allEntry.items, topic), safeLimit)
  }

  return []
}
