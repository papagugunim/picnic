import type { RussiaNewsItem } from '@/lib/russia-news'
import { getUpstashJson, setUpstashJson } from '@/lib/upstash'

const UPSTASH_NEWS_TTL_SECONDS = 180
const UPSTASH_ARCHIVE_TTL_SECONDS = 300

type NewsScope = 'today' | 'archive'

function buildCacheKey(scope: NewsScope, topic: string | null, limit: number, cursor: string | null) {
  const normalizedTopic = (topic || 'all').trim()
  const normalizedCursor = (cursor || 'first').trim()
  const normalizedLimit = Math.max(1, Math.min(limit, 20))
  return `picnic:russia-news:${scope}:${normalizedTopic}:${normalizedLimit}:${normalizedCursor}`
}

export async function readUpstashRussiaNews(
  scope: NewsScope,
  topic: string | null,
  limit: number,
  cursor: string | null
) {
  const key = buildCacheKey(scope, topic, limit, cursor)
  const value = await getUpstashJson<RussiaNewsItem[]>(key)
  if (!Array.isArray(value)) return []
  return value.filter((item): item is RussiaNewsItem => Boolean(item && typeof item === 'object'))
}

export async function writeUpstashRussiaNews(
  scope: NewsScope,
  topic: string | null,
  limit: number,
  cursor: string | null,
  items: RussiaNewsItem[]
) {
  const key = buildCacheKey(scope, topic, limit, cursor)
  const ttl = scope === 'today' ? UPSTASH_NEWS_TTL_SECONDS : UPSTASH_ARCHIVE_TTL_SECONDS
  await setUpstashJson(key, items, ttl)
}

