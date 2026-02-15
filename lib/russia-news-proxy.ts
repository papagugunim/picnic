import { getRussiaNewsBaseUrl, normalizeTopic, type RussiaNewsApiPayload, type RussiaNewsItem } from '@/lib/russia-news'
import { DEFAULT_RUSSIA_NEWS_BASE_URL } from '@/lib/russia-news'

interface FetchRussiaNewsOptions {
  endpoint: '/api/today-news' | '/api/archive'
  cursor?: string | null
  topic?: string | null
  limit?: number
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const UPSTREAM_TIMEOUT_MS = 8000

function toSafeLimit(input?: number): number {
  if (!input || Number.isNaN(input)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, input))
}

function normalizeItem(raw: any, index: number): RussiaNewsItem {
  const title = typeof raw?.title === 'string' ? raw.title : ''
  const summary = typeof raw?.summary === 'string' ? raw.summary : ''
  const link = typeof raw?.link === 'string' ? raw.link : ''
  const publishedAt = typeof raw?.published_at === 'string' ? raw.published_at : ''

  return {
    id: String(raw?.id ?? `${publishedAt || 'na'}-${index}`),
    title,
    title_original: typeof raw?.title_original === 'string' ? raw.title_original : title,
    summary,
    summary_original: typeof raw?.summary_original === 'string' ? raw.summary_original : summary,
    link,
    published_at: publishedAt,
    topic:
      typeof raw?.topic === 'string'
        ? raw.topic
        : typeof raw?.category === 'string'
        ? raw.category
        : '기타',
    source_name: typeof raw?.source_name === 'string' ? raw.source_name : 'unknown',
    source_kind: typeof raw?.source_kind === 'string' ? raw.source_kind : 'rss',
    is_moscow: Boolean(raw?.is_moscow),
    views_count: typeof raw?.views_count === 'number' ? raw.views_count : null,
  }
}

export async function fetchRussiaNewsFromUpstream(options: FetchRussiaNewsOptions): Promise<RussiaNewsApiPayload> {
  const primaryBaseUrl = getRussiaNewsBaseUrl()
  const fallbackBaseUrl = DEFAULT_RUSSIA_NEWS_BASE_URL.replace(/\/$/, '')
  const limit = toSafeLimit(options.limit)
  const topic = normalizeTopic(options.topic || null)

  async function requestFrom(baseUrl: string): Promise<RussiaNewsApiPayload> {
    const url = new URL(`${baseUrl}${options.endpoint}`)
    url.searchParams.set('limit', String(limit))
    if (options.cursor) url.searchParams.set('cursor', options.cursor)
    if (topic) url.searchParams.set('topic', topic)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
        next: { revalidate: 0 },
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Upstream request failed (${response.status}): ${body.slice(0, 200)}`)
      }

      const payload = (await response.json()) as { items?: any[] }
      const items = Array.isArray(payload?.items) ? payload.items : []

      return {
        items: items.map((item, index) => normalizeItem(item, index)),
      }
    } finally {
      clearTimeout(timer)
    }
  }

  const primaryPayload = await requestFrom(primaryBaseUrl)
  if (primaryPayload.items.length > 0 || primaryBaseUrl === fallbackBaseUrl) {
    return primaryPayload
  }

  return requestFrom(fallbackBaseUrl)
}
