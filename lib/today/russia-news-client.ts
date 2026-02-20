import { normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'

export const RUSSIA_TODAY_NEWS_CACHE_VERSION = '2'
export const RUSSIA_TODAY_NEWS_LOCAL_CACHE_TTL_MS = 60 * 60 * 1000

const FETCH_TIMEOUT_MS = 9000
const MAX_RETRY_PER_REQUEST = 2
const DEFAULT_LIMIT = 8
const WARMUP_MARKER_KEY = `russia-news:today:warmup:v${RUSSIA_TODAY_NEWS_CACHE_VERSION}`

const TOPICS: RussiaNewsTopic[] = ['정치', '사회', '경제', '문화', '날씨']

function buildTodayCacheKey(topic: RussiaNewsTopic): string {
  return `russia-news:today:${topic || 'all'}:v${RUSSIA_TODAY_NEWS_CACHE_VERSION}`
}

function filterByTopic(items: RussiaNewsItem[], topic: RussiaNewsTopic): RussiaNewsItem[] {
  if (!topic) return items
  return items.filter((item) => normalizeTopic(item.topic || null) === topic)
}

function clip(items: RussiaNewsItem[], limit: number): RussiaNewsItem[] {
  if (!Number.isFinite(limit) || limit <= 0) return items.slice(0, DEFAULT_LIMIT)
  return items.slice(0, Math.min(Math.floor(limit), 20))
}

function readRawCachedNews(topic: RussiaNewsTopic): RussiaNewsItem[] {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(buildTodayCacheKey(topic))
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as { savedAt?: number; items?: RussiaNewsItem[] }
    if (!parsed?.savedAt || !Array.isArray(parsed?.items)) {
      return []
    }

    if (Date.now() - parsed.savedAt > RUSSIA_TODAY_NEWS_LOCAL_CACHE_TTL_MS) {
      window.localStorage.removeItem(buildTodayCacheKey(topic))
      return []
    }

    return parsed.items
  } catch {
    window.localStorage.removeItem(buildTodayCacheKey(topic))
    return []
  }
}

export function readTodayLocalCachedNews(topicInput: RussiaNewsTopic, limit: number = DEFAULT_LIMIT): RussiaNewsItem[] {
  const topic = normalizeTopic(topicInput)
  const specific = filterByTopic(readRawCachedNews(topic), topic)

  if (specific.length > 0) {
    return clip(specific, limit)
  }

  if (!topic) {
    return []
  }

  return clip(filterByTopic(readRawCachedNews(''), topic), limit)
}

export function writeTodayLocalCachedNews(topicInput: RussiaNewsTopic, items: RussiaNewsItem[]): void {
  if (typeof window === 'undefined' || !Array.isArray(items) || items.length === 0) return

  const topic = normalizeTopic(topicInput)
  const payload = JSON.stringify({
    savedAt: Date.now(),
    items,
  })

  window.localStorage.setItem(buildTodayCacheKey(topic), payload)
  if (!topic) {
    window.localStorage.setItem(buildTodayCacheKey(''), payload)
  }
}

interface RequestTodayNewsOptions {
  limit?: number
  cacheMode?: RequestCache
  bustCache?: boolean
}

async function requestTodayNews(
  endpoint: '/api/russia-news' | '/api/russia-news/archive',
  topicInput: RussiaNewsTopic,
  options: RequestTodayNewsOptions
): Promise<RussiaNewsItem[]> {
  if (typeof window === 'undefined') return []

  const topic = normalizeTopic(topicInput)
  const limit = options.limit ?? DEFAULT_LIMIT
  const cacheMode = options.cacheMode ?? 'default'
  const url = new URL(endpoint, window.location.origin)

  url.searchParams.set('limit', String(limit))
  url.searchParams.set('v', RUSSIA_TODAY_NEWS_CACHE_VERSION)
  if (topic) {
    url.searchParams.set('topic', topic)
  }
  if (options.bustCache) {
    url.searchParams.set('_', String(Date.now()))
  }

  for (let attempt = 0; attempt < MAX_RETRY_PER_REQUEST; attempt++) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        cache: cacheMode,
        signal: controller.signal,
      })
      const data = await response.json()

      if (!response.ok || data?.error) {
        throw new Error(data?.error || '뉴스를 불러오지 못했습니다.')
      }

      const items = Array.isArray(data?.items) ? (data.items as RussiaNewsItem[]) : []
      if (items.length > 0) {
        return clip(items, limit)
      }
      return []
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError'
      if (!isAbort || attempt === MAX_RETRY_PER_REQUEST - 1) {
        throw error
      }
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  return []
}

export async function fetchTodayNewsWithFallback(
  topicInput: RussiaNewsTopic,
  options: RequestTodayNewsOptions = {}
): Promise<RussiaNewsItem[]> {
  const topic = normalizeTopic(topicInput)
  const candidates: Array<{ endpoint: '/api/russia-news' | '/api/russia-news/archive'; topic: RussiaNewsTopic }> = [
    { endpoint: '/api/russia-news', topic },
    { endpoint: '/api/russia-news/archive', topic },
  ]

  if (topic) {
    candidates.push(
      { endpoint: '/api/russia-news', topic: '' },
      { endpoint: '/api/russia-news/archive', topic: '' }
    )
  }

  let lastError: unknown = null
  for (const candidate of candidates) {
    try {
      const items = await requestTodayNews(candidate.endpoint, candidate.topic, options)
      if (items.length > 0) {
        return items
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  return []
}

export function shouldWarmupTodayNews(minIntervalMs: number = 15 * 60 * 1000): boolean {
  if (typeof window === 'undefined') return false
  const raw = window.localStorage.getItem(WARMUP_MARKER_KEY)
  if (!raw) return true

  const lastWarmupAt = Number(raw)
  if (!Number.isFinite(lastWarmupAt)) return true

  return Date.now() - lastWarmupAt > minIntervalMs
}

export function markTodayNewsWarmup(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(WARMUP_MARKER_KEY, String(Date.now()))
}

export async function warmupTodayNewsCache(): Promise<void> {
  const broadItems = await fetchTodayNewsWithFallback('', { limit: 12, cacheMode: 'force-cache' })
  if (broadItems.length > 0) {
    writeTodayLocalCachedNews('', broadItems)
    for (const topic of TOPICS) {
      const topicItems = filterByTopic(broadItems, topic)
      if (topicItems.length > 0) {
        writeTodayLocalCachedNews(topic, topicItems)
      }
    }
  }

  const missingTopics = TOPICS.filter((topic) => readTodayLocalCachedNews(topic, 1).length === 0)
  if (missingTopics.length > 0) {
    await Promise.allSettled(
      missingTopics.map(async (topic) => {
        const topicItems = await fetchTodayNewsWithFallback(topic, { limit: 8, cacheMode: 'force-cache' })
        if (topicItems.length > 0) {
          writeTodayLocalCachedNews(topic, topicItems)
        }
      })
    )
  }

  markTodayNewsWarmup()
}
