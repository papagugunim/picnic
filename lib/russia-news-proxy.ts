import { getRussiaNewsBaseUrl, normalizeTopic, type RussiaNewsApiPayload, type RussiaNewsItem } from '@/lib/russia-news'

interface FetchRussiaNewsOptions {
  endpoint: '/api/today-news' | '/api/archive'
  cursor?: string | null
  topic?: string | null
  limit?: number
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

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
  const baseUrl = getRussiaNewsBaseUrl()
  const url = new URL(`${baseUrl}${options.endpoint}`)

  const limit = toSafeLimit(options.limit)
  url.searchParams.set('limit', String(limit))

  if (options.cursor) url.searchParams.set('cursor', options.cursor)
  const topic = normalizeTopic(options.topic || null)
  if (topic) url.searchParams.set('topic', topic)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
    next: { revalidate: 0 },
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
}
