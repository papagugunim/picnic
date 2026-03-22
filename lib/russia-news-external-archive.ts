/**
 * rnews-archive.vercel.app 외부 아카이브에서 뉴스를 가져오는 모듈
 *
 * 카테고리 매핑은 키워드 기반으로 동작하므로, 향후 아카이브에 새 카테고리가
 * 추가되어도 자동으로 가장 유사한 Picnic 토픽으로 매핑됩니다.
 */

import type { RussiaNewsItem, RussiaNewsTopic } from '@/lib/russia-news'

const EXTERNAL_ARCHIVE_BASE_URL = 'https://rnews-archive.vercel.app'
const FETCH_TIMEOUT_MS = 8000

// ──────────────────────────────────────────────
// 카테고리 → Picnic 토픽 동적 매핑
// ──────────────────────────────────────────────

/**
 * 카테고리 문자열에서 키워드를 추출하여 Picnic 토픽으로 매핑합니다.
 * 새로운 카테고리가 추가될 경우 키워드 매칭으로 자동 처리됩니다.
 */
function mapCategoryToTopic(categoryHeader: string): RussiaNewsTopic {
  const normalized = categoryHeader.toLowerCase().replace(/[^\w가-힣]/g, ' ').trim()

  // 경제 관련 키워드
  if (
    normalized.includes('경제') ||
    normalized.includes('금융') ||
    normalized.includes('시장') ||
    normalized.includes('제재') ||
    normalized.includes('에너지') ||
    normalized.includes('자원') ||
    normalized.includes('무역') ||
    normalized.includes('산업') ||
    normalized.includes('투자') ||
    normalized.includes('루블') ||
    normalized.includes('석유') ||
    normalized.includes('가스')
  ) {
    return '경제'
  }

  // 정치·외교·군사 관련 키워드
  if (
    normalized.includes('정치') ||
    normalized.includes('외교') ||
    normalized.includes('군사') ||
    normalized.includes('전쟁') ||
    normalized.includes('국제') ||
    normalized.includes('안보') ||
    normalized.includes('국방') ||
    normalized.includes('크렘린') ||
    normalized.includes('나토') ||
    normalized.includes('유엔') ||
    normalized.includes('외무')
  ) {
    return '정치'
  }

  // 문화·스포츠·연예 관련 키워드
  if (
    normalized.includes('문화') ||
    normalized.includes('예술') ||
    normalized.includes('스포츠') ||
    normalized.includes('영화') ||
    normalized.includes('음악') ||
    normalized.includes('연예') ||
    normalized.includes('축제') ||
    normalized.includes('박물관') ||
    normalized.includes('역사')
  ) {
    return '문화'
  }

  // 날씨·자연재해 관련 키워드
  if (
    normalized.includes('날씨') ||
    normalized.includes('기후') ||
    normalized.includes('자연') ||
    normalized.includes('재해') ||
    normalized.includes('홍수') ||
    normalized.includes('지진') ||
    normalized.includes('기온')
  ) {
    return '날씨'
  }

  // 기본값: 사회 (사회/생활/범죄/교통 등)
  return '사회'
}

// ──────────────────────────────────────────────
// 마크다운 파싱
// ──────────────────────────────────────────────

interface ParsedNewsItem {
  title: string
  summary: string
  link: string
  source: string
  category: string
  topic: RussiaNewsTopic
}

/**
 * rnews-archive 마크다운 형식을 파싱합니다.
 *
 * 형식 예시:
 * ⚔️ 전쟁/군사
 * 1. 제목 [NEW]
 * 본문 요약 첫째줄
 * 출처: RIA — https://example.com
 *
 * 🏛️ 정치/외교
 * 1. 다음 제목
 * ...
 */
function parseMarkdownContent(content: string): ParsedNewsItem[] {
  const items: ParsedNewsItem[] = []

  // 카테고리 헤더 패턴: 이모지 포함 문자열로 시작하는 줄
  const categoryHeaderPattern = /^(.+[가-힣\/]+)\s*$/
  const lines = content.split('\n')

  let currentCategory = ''
  let currentTopic: RussiaNewsTopic = '사회'
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // 빈 줄 스킵
    if (!line) {
      i++
      continue
    }

    // 카테고리 헤더 감지: 숫자로 시작하지 않고 카테고리 패턴과 일치
    // 이모지가 포함되어 있고 한글 카테고리명이 있는 경우
    if (!line.match(/^\d+\./) && line.match(/[가-힣]/) && line.match(/[^\w]/)) {
      // 뉴스 항목 번호 패턴과 구별 (출처: 로 시작하는 줄 제외)
      if (!line.startsWith('출처') && !line.startsWith('소스')) {
        const headerMatch = line.match(categoryHeaderPattern)
        if (headerMatch) {
          currentCategory = line
          currentTopic = mapCategoryToTopic(line)
          i++
          continue
        }
      }
    }

    // 뉴스 항목 시작: "숫자. 제목" 패턴
    const itemMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (itemMatch && currentCategory) {
      let title = itemMatch[2].replace(/\[[^\]]+\]/g, '').trim()
      let summary = ''
      let link = ''
      let source = ''
      i++

      // 다음 줄들을 읽어서 요약 및 링크 추출
      while (i < lines.length) {
        const nextLine = lines[i].trim()

        if (!nextLine) {
          i++
          break
        }

        // 다음 뉴스 항목 시작이면 중단
        if (nextLine.match(/^\d+\.\s+/)) {
          break
        }

        // 카테고리 헤더면 중단
        if (!nextLine.startsWith('출처') && !nextLine.startsWith('소스') && nextLine.match(/[가-힣]/) && nextLine.match(/[^\w]/) && !nextLine.match(/^\d+\./)) {
          const potentialHeader = nextLine.match(categoryHeaderPattern)
          if (potentialHeader) {
            break
          }
        }

        // 출처 라인에서 링크 및 소스명 추출: "출처: RIA — https://..."
        if (nextLine.startsWith('출처') || nextLine.startsWith('소스')) {
          const urlMatch = nextLine.match(/https?:\/\/[^\s]+/)
          if (urlMatch) {
            link = urlMatch[0]
          }
          const sourceMatch = nextLine.match(/^(?:출처|소스):\s*(.+?)\s*[—–-]\s*https?:\/\//)
          if (sourceMatch) {
            source = sourceMatch[1].trim()
          }
          i++
          break
        }

        // 요약 내용 축적
        if (summary) {
          summary += ' ' + nextLine
        } else {
          summary = nextLine
        }
        i++
      }

      if (title) {
        items.push({
          title,
          summary: summary || title,
          link: link || '',
          source,
          category: currentCategory,
          topic: currentTopic,
        })
      }
      continue
    }

    i++
  }

  return items
}

// ──────────────────────────────────────────────
// API 응답 타입
// ──────────────────────────────────────────────

interface ExternalArchiveReport {
  id: string
  timestamp: string
  content: string
  itemCount: number
}

interface ExternalArchiveResponse {
  reports: ExternalArchiveReport[]
  hasMore: boolean
  total: number
  page: number
}

// ──────────────────────────────────────────────
// 메인 fetch 함수
// ──────────────────────────────────────────────

/**
 * rnews-archive.vercel.app에서 최신 뉴스 리포트를 가져와서 RussiaNewsItem 형식으로 변환합니다.
 * 최신 리포트 2개를 가져와 합칩니다.
 */
export async function fetchFromExternalArchive(options?: {
  limit?: number
  topic?: string | null
}): Promise<RussiaNewsItem[]> {
  const { limit = 20, topic = null } = options ?? {}

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(
      `${EXTERNAL_ARCHIVE_BASE_URL}/api/reports?page=0&limit=2`,
      {
        signal: controller.signal,
        next: { revalidate: 300 }, // 5분 캐시
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Picnic-App/1.0',
        },
      }
    )
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    return []
  }

  let data: ExternalArchiveResponse
  try {
    data = await response.json()
  } catch {
    return []
  }

  if (!Array.isArray(data.reports) || data.reports.length === 0) {
    return []
  }

  const allItems: RussiaNewsItem[] = []

  for (const report of data.reports) {
    if (!report.content) continue

    const reportTimestamp = report.timestamp || report.id
    const parsedDate = new Date(reportTimestamp)
    const publishedAt = Number.isFinite(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString()

    const parsedItems = parseMarkdownContent(report.content)

    for (let idx = 0; idx < parsedItems.length; idx++) {
      const item = parsedItems[idx]

      // 토픽 필터링 (요청된 토픽이 있는 경우)
      if (topic && item.topic !== topic) continue

      const itemId = `rnews-archive-${report.id}-${idx}`

      allItems.push({
        id: itemId,
        title: item.title,
        title_original: item.title,
        summary: item.summary,
        summary_original: item.summary,
        link: item.link || `${EXTERNAL_ARCHIVE_BASE_URL}`,
        published_at: publishedAt,
        topic: item.topic,
        source_name: item.source || 'rnews-archive',
        source_kind: 'archive',
        is_moscow: true,
        views_count: null,
      })
    }
  }

  // 중복 제목 제거 (같은 이슈가 여러 리포트에 등장할 수 있음)
  const seen = new Set<string>()
  const deduped = allItems.filter((item) => {
    const key = item.title.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduped.slice(0, limit)
}
