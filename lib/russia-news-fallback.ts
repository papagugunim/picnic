import { normalizeTopic, type RussiaNewsItem } from '@/lib/russia-news'

const BASE_FALLBACK_NEWS: Array<{
  id: string
  title: string
  summary: string
  topic: string
  link: string
}> = [
  {
    id: 'fallback-social-1',
    title: '모스크바 생활 소식 업데이트 중입니다',
    summary: '러시아 현지 소식을 안정적으로 불러오는 중입니다. 잠시 후 자동으로 최신 기사로 교체됩니다.',
    topic: '사회',
    link: 'https://www.rbc.ru',
  },
  {
    id: 'fallback-economy-1',
    title: '러시아 경제 뉴스 수집이 재시도되고 있습니다',
    summary: '업스트림 지연 시 자동 복구가 실행됩니다. 새로고침 없이도 최신 데이터가 반영됩니다.',
    topic: '경제',
    link: 'https://www.interfax.ru/business/',
  },
  {
    id: 'fallback-culture-1',
    title: '모스크바 문화 소식 동기화 중입니다',
    summary: '문화 관련 기사 소스를 재연결하고 있습니다. 연결 완료 즉시 최신 기사로 전환됩니다.',
    topic: '문화',
    link: 'https://www.mos.ru/news/',
  },
  {
    id: 'fallback-weather-1',
    title: '모스크바 날씨 소식 갱신 준비 중입니다',
    summary: '기상 관련 기사와 도시 생활 정보를 함께 불러오고 있습니다.',
    topic: '날씨',
    link: 'https://meteoinfo.ru',
  },
  {
    id: 'fallback-social-2',
    title: '교통·생활 안전 뉴스 연결 상태를 점검 중입니다',
    summary: '일시적인 네트워크 지연이 발생해도 자동 복구 후 정상 기사로 대체됩니다.',
    topic: '사회',
    link: 'https://www.mos.ru/news/',
  },
  {
    id: 'fallback-economy-2',
    title: '환율·물가 관련 경제 기사 재동기화 중입니다',
    summary: '경제 섹션은 백오프 재시도로 안정적으로 복구되며 최신 기사 우선으로 교체됩니다.',
    topic: '경제',
    link: 'https://www.cbr.ru',
  },
  {
    id: 'fallback-culture-2',
    title: '러시아 지역 문화 행사 소식을 준비 중입니다',
    summary: '문화·여가 중심 기사 소스를 확인하고 있습니다. 잠시 후 정상 기사로 표시됩니다.',
    topic: '문화',
    link: 'https://kudago.com/msk/',
  },
  {
    id: 'fallback-weather-2',
    title: '체감온도·강수 관련 날씨 기사를 불러오는 중입니다',
    summary: '날씨 카테고리 데이터가 복구되면 최신 기사부터 순차적으로 반영됩니다.',
    topic: '날씨',
    link: 'https://yandex.ru/pogoda/moscow',
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
