import { normalizeTopic, type RussiaNewsItem } from '@/lib/russia-news'

const BASE_FALLBACK_NEWS: Array<{
  id: string
  title: string
  summary: string
  topic: string
  link: string
}> = [
  {
    id: 'fallback-politics-1',
    title: '러시아 정치·군사 뉴스 동기화 중입니다',
    summary: '정치/군사 카테고리 데이터 수집을 재시도하고 있습니다. 잠시 후 최신 기사로 자동 교체됩니다.',
    topic: '정치/군사',
    link: 'https://ria.ru/politics/',
  },
  {
    id: 'fallback-economy-1',
    title: '러시아 경제·금융 뉴스 수집이 재시도되고 있습니다',
    summary: '업스트림 지연 시 자동 복구가 실행됩니다. 새로고침 없이도 최신 데이터가 반영됩니다.',
    topic: '경제/금융',
    link: 'https://www.interfax.ru/business/',
  },
  {
    id: 'fallback-social-1',
    title: '모스크바 사회·문화 소식 업데이트 중입니다',
    summary: '러시아 현지 소식을 안정적으로 불러오는 중입니다. 잠시 후 자동으로 최신 기사로 교체됩니다.',
    topic: '사회/문화',
    link: 'https://www.mos.ru/news/',
  },
  {
    id: 'fallback-intl-1',
    title: '국제·외교 뉴스를 불러오는 중입니다',
    summary: '주요 외교·국제 이슈 데이터를 수집하고 있습니다. 잠시 후 최신 기사로 전환됩니다.',
    topic: '국제/외교',
    link: 'https://tass.com/world',
  },
  {
    id: 'fallback-tech-1',
    title: '러시아 과학·기술 뉴스 연결 중입니다',
    summary: 'IT·기술 분야 기사 소스를 재연결하고 있습니다. 연결 완료 즉시 최신 기사로 전환됩니다.',
    topic: '과학/기술',
    link: 'https://vc.ru',
  },
  {
    id: 'fallback-weather-1',
    title: '모스크바 날씨·기후 소식 갱신 준비 중입니다',
    summary: '기상 관련 기사와 도시 생활 정보를 함께 불러오고 있습니다.',
    topic: '날씨/기후',
    link: 'https://meteoinfo.ru',
  },
]

export function getEmergencyFallbackNews(topicInput: string | null, limit: number): RussiaNewsItem[] {
  const topic = normalizeTopic(topicInput)
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.floor(limit), 20)) : 8
  const now = Date.now()

  const source = topic
    ? BASE_FALLBACK_NEWS.filter((item) => normalizeTopic(item.topic) === topic)
    : BASE_FALLBACK_NEWS

  const selected = source.length > 0 ? source : BASE_FALLBACK_NEWS

  return selected.slice(0, safeLimit).map((item, index) => ({
    id: `${item.id}-${topic || 'all'}-${index}`,
    title: item.title,
    title_original: item.title,
    summary: item.summary,
    summary_original: item.summary,
    link: item.link,
    published_at: new Date(now - index * 60_000).toISOString(),
    topic: item.topic,
    source_name: 'picnic-fallback',
    source_kind: 'rss',
    is_moscow: true,
    views_count: null,
  }))
}
