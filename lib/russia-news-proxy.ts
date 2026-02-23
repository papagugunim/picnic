import {
  getRussiaNewsBaseUrl,
  normalizeTopic,
  type RussiaNewsApiPayload,
  type RussiaNewsItem,
  type RussiaNewsTopic,
} from '@/lib/russia-news'
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
const UPSTREAM_REVALIDATE_SECONDS = 180
const inFlightUpstreamRequests = new Map<string, Promise<RussiaNewsApiPayload>>()
const WEATHER_SOURCE_HINTS = [/weather/i, /meteoinfo/i, /hydromet/i, /pogoda/i]
const TOPIC_KEYWORDS: Record<Exclude<RussiaNewsTopic, ''>, string[]> = {
  정치: [
    '정치',
    '대통령',
    '국회',
    '선거',
    '정부',
    'кремл',
    'президент',
    'путин',
    'дум',
    'госдум',
    'депутат',
    'санкц',
    'войн',
    'нато',
    'оон',
    'ukraine',
    'zelensky',
    'politic',
    'election',
    'government',
    'parliament',
    'minister',
    'party',
  ],
  사회: [
    '사회',
    '생활',
    '교통',
    '도시',
    '안전',
    'moscow',
    'москв',
    'город',
    'transport',
    'city',
  ],
  경제: [
    '경제',
    '환율',
    '물가',
    '금리',
    'rub',
    'руб',
    'финанс',
    'эконом',
    'bank',
    'market',
  ],
  문화: [
    '문화',
    '행사',
    '전시',
    '공연',
    '축제',
    'культур',
    'музей',
    'театр',
    'festival',
    'culture',
  ],
  날씨: [
    '날씨',
    '기온',
    '강수',
    '폭설',
    '폭우',
    '한파',
    '태풍',
    '예보',
    '체감',
    'weather',
    'forecast',
    'storm',
    'snow',
    'rain',
    'wind',
    'temperature',
    'погод',
    'метео',
    'снег',
    'метел',
    'гололед',
    'мороз',
    'дожд',
    'ливн',
    'шторм',
    'циклон',
    'ветер',
    'температур',
  ],
}

function normalizeMatchText(input: string): string {
  return input.toLowerCase().replace(/ё/g, 'е')
}

function keywordMatched(text: string, keyword: string): boolean {
  // 영문 키워드는 단어 단위로만 매칭해 ukraina -> rain 같은 오탐을 방지한다.
  if (/^[a-z]+$/.test(keyword)) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`).test(text)
  }
  return text.includes(keyword)
}

function calculateTopicScores(text: string): Record<Exclude<RussiaNewsTopic, ''>, number> {
  const scores: Record<Exclude<RussiaNewsTopic, ''>, number> = {
    정치: 0,
    사회: 0,
    경제: 0,
    문화: 0,
    날씨: 0,
  }

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS) as Array<
    [Exclude<RussiaNewsTopic, ''>, string[]]
  >) {
    for (const keyword of keywords) {
      if (keywordMatched(text, keyword)) {
        scores[topic] += 1
      }
    }
  }

  return scores
}

function inferTopicFromScores(
  scores: Record<Exclude<RussiaNewsTopic, ''>, number>
): RussiaNewsTopic {
  const sorted = (Object.entries(scores) as Array<[Exclude<RussiaNewsTopic, ''>, number]>).sort(
    (a, b) => b[1] - a[1]
  )
  const [firstTopic, firstScore] = sorted[0]
  if (!firstScore || firstScore <= 0) return ''

  const [secondTopic, secondScore] = sorted[1]
  if (firstTopic === '날씨' && secondTopic && secondTopic !== '날씨' && firstScore === secondScore) {
    return secondTopic
  }

  return firstTopic
}

function normalizeRemoteTopic(rawTopic: string, title: string, summary: string, link: string, sourceName: string): string {
  const normalizedRaw = normalizeTopic(rawTopic || null)
  const sourceNameText = sourceName.toLowerCase()
  const isWeatherSource = WEATHER_SOURCE_HINTS.some((pattern) => pattern.test(sourceNameText))

  const matchedText = normalizeMatchText([title, summary, link, sourceName].join(' '))
  const scores = calculateTopicScores(matchedText)
  const inferred = inferTopicFromScores(scores)

  if (normalizedRaw === '날씨') {
    if (isWeatherSource) return '날씨'

    const weatherScore = scores['날씨']
    const strongestOtherScore = Math.max(scores['정치'], scores['사회'], scores['경제'], scores['문화'])
    if (weatherScore === 0) {
      if (strongestOtherScore > 0 && inferred && inferred !== '날씨') {
        return inferred
      }
      // 비기상 출처인데 날씨 근거가 전혀 없으면 생활/사회성 기사로 기본 분류.
      return '사회'
    }
    if (strongestOtherScore >= weatherScore + 1 && inferred && inferred !== '날씨') {
      return inferred
    }
    return '날씨'
  }

  if (normalizedRaw) return normalizedRaw
  if (inferred) return inferred

  const trimmed = rawTopic.trim()
  return trimmed || '기타'
}

function toSafeLimit(input?: number): number {
  if (!input || Number.isNaN(input)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, input))
}

function clipPayload(payload: RussiaNewsApiPayload, limit: number): RussiaNewsApiPayload {
  if (payload.items.length <= limit) return payload
  return {
    ...payload,
    items: payload.items.slice(0, limit),
  }
}

function normalizeItem(raw: any, index: number): RussiaNewsItem {
  const title = typeof raw?.title === 'string' ? raw.title : ''
  const summary = typeof raw?.summary === 'string' ? raw.summary : ''
  const link = typeof raw?.link === 'string' ? raw.link : ''
  const publishedAt = typeof raw?.published_at === 'string' ? raw.published_at : ''
  const sourceName = typeof raw?.source_name === 'string' ? raw.source_name : 'unknown'
  const rawTopic =
    typeof raw?.topic === 'string'
      ? raw.topic
      : typeof raw?.category === 'string'
      ? raw.category
      : ''

  return {
    id: String(raw?.id ?? `${publishedAt || 'na'}-${index}`),
    title,
    title_original: typeof raw?.title_original === 'string' ? raw.title_original : title,
    summary,
    summary_original: typeof raw?.summary_original === 'string' ? raw.summary_original : summary,
    link,
    published_at: publishedAt,
    topic: normalizeRemoteTopic(rawTopic, title, summary, link, sourceName),
    source_name: sourceName,
    source_kind: typeof raw?.source_kind === 'string' ? raw.source_kind : 'rss',
    is_moscow: Boolean(raw?.is_moscow),
    views_count: typeof raw?.views_count === 'number' ? raw.views_count : null,
  }
}

export async function fetchRussiaNewsFromUpstream(options: FetchRussiaNewsOptions): Promise<RussiaNewsApiPayload> {
  const primaryBaseUrl = getRussiaNewsBaseUrl()
  const fallbackBaseUrl = DEFAULT_RUSSIA_NEWS_BASE_URL.replace(/\/$/, '')
  const requestedLimit = toSafeLimit(options.limit)
  const topic = normalizeTopic(options.topic || null)

  async function requestFrom(baseUrl: string, limitForRequest?: number): Promise<RussiaNewsApiPayload> {
    const url = new URL(`${baseUrl}${options.endpoint}`)
    if (typeof limitForRequest === 'number') {
      url.searchParams.set('limit', String(limitForRequest))
    }
    if (options.cursor) url.searchParams.set('cursor', options.cursor)
    if (topic) url.searchParams.set('topic', topic)

    const requestKey = url.toString()
    const existingRequest = inFlightUpstreamRequests.get(requestKey)
    if (existingRequest) {
      return existingRequest
    }

    const requestPromise = (async () => {
      let lastError: unknown = null

      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

        try {
          const response = await fetch(requestKey, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
            cache: 'force-cache',
            next: { revalidate: UPSTREAM_REVALIDATE_SECONDS },
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
        } catch (error) {
          lastError = error
          const isAbort =
            error instanceof Error &&
            (error.name === 'AbortError' || error.message.toLowerCase().includes('aborted'))
          if (!isAbort || attempt === 1) {
            throw error
          }
        } finally {
          clearTimeout(timer)
        }
      }

      throw lastError instanceof Error ? lastError : new Error('Upstream request failed')
    })()

    inFlightUpstreamRequests.set(requestKey, requestPromise)

    try {
      return await requestPromise
    } finally {
      if (inFlightUpstreamRequests.get(requestKey) === requestPromise) {
        inFlightUpstreamRequests.delete(requestKey)
      }
    }
  }

  // NOTE: some upstream deployments intermittently return an empty list
  // when a small `limit` is explicitly provided. Retry once without `limit`.
  const initialLimit = !topic && requestedLimit === DEFAULT_LIMIT ? undefined : requestedLimit
  const baseUrls = Array.from(new Set([primaryBaseUrl, fallbackBaseUrl]))

  let lastError: unknown = null
  let lastEmptyPayload: RussiaNewsApiPayload | null = null

  for (const baseUrl of baseUrls) {
    try {
      const firstAttempt = await requestFrom(baseUrl, initialLimit)
      if (firstAttempt.items.length > 0) {
        return clipPayload(firstAttempt, requestedLimit)
      }
      lastEmptyPayload = firstAttempt

      if (!topic && typeof initialLimit === 'number') {
        const relaxedAttempt = await requestFrom(baseUrl)
        if (relaxedAttempt.items.length > 0) {
          return clipPayload(relaxedAttempt, requestedLimit)
        }
        lastEmptyPayload = relaxedAttempt
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastError && !lastEmptyPayload) {
    throw lastError
  }

  return clipPayload(lastEmptyPayload || { items: [] }, requestedLimit)
}
