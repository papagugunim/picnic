/**
 * rnews-archive.vercel.app 외부 아카이브에서 뉴스를 가져오는 모듈
 * - RSS 직접 수집 + 기사 본문 크롤링 + 한국어 번역
 * - 구조화된 JSON 형식으로 반환 (마크다운 파싱 불필요)
 */

import type { RussiaNewsItem, RussiaNewsTopic } from '@/lib/russia-news'

const EXTERNAL_ARCHIVE_BASE_URL = 'https://rnews-archive.vercel.app'
const FETCH_TIMEOUT_MS = 8000

// rnews-archive가 반환하는 아이템 형식
interface ExternalArchiveItem {
  id: string
  title: string
  title_original: string
  summary: string
  summary_original: string
  link: string
  published_at: string
  source: string
  source_kind: string
  topic: string
  is_moscow: boolean
  views_count: number | null
  fetchedAt: string
}

interface ExternalArchiveResponse {
  items: ExternalArchiveItem[]
  total: number
  updatedAt: string | null
}

/**
 * rnews-archive.vercel.app에서 최신 뉴스를 가져와 RussiaNewsItem 형식으로 변환합니다.
 */
export async function fetchFromExternalArchive(options?: {
  limit?: number
  topic?: string | null
}): Promise<RussiaNewsItem[]> {
  const { limit = 20, topic = null } = options ?? {}

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  const url = new URL(`${EXTERNAL_ARCHIVE_BASE_URL}/api/reports`)
  url.searchParams.set('limit', String(Math.min(limit, 50)))
  if (topic) url.searchParams.set('topic', topic)

  let response: Response
  try {
    response = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 300 }, // 5분 캐시
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Picnic-App/1.0',
      },
    })
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) return []

  let data: ExternalArchiveResponse
  try {
    data = await response.json()
  } catch {
    return []
  }

  if (!Array.isArray(data.items) || data.items.length === 0) return []

  // 중복 제목 제거
  const seen = new Set<string>()
  return data.items
    .filter(item => {
      const key = item.title?.trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((item): RussiaNewsItem => ({
      id: item.id || `rn-${Math.random().toString(36).slice(2)}`,
      title: item.title || item.title_original || '',
      title_original: item.title_original || item.title || '',
      summary: item.summary || '',
      summary_original: item.summary_original || item.summary || '',
      link: item.link || EXTERNAL_ARCHIVE_BASE_URL,
      published_at: item.published_at || new Date().toISOString(),
      topic: normalizeTopic(item.topic),
      source_name: item.source || 'rnews-archive',
      source_kind: (item.source_kind as 'rss' | 'telegram') || 'rss',
      is_moscow: Boolean(item.is_moscow),
      views_count: item.views_count ?? null,
    }))
    .slice(0, limit)
}

type KnownTopic = '' | '정치' | '사회' | '경제' | '문화' | '날씨'

function normalizeTopic(value: string | null | undefined): KnownTopic {
  if (value === '정치' || value === '사회' || value === '경제' || value === '문화' || value === '날씨') {
    return value
  }
  return '사회'
}
