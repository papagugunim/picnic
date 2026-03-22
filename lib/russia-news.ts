export type RussiaNewsTopic = '' | '정치/군사' | '경제/금융' | '사회/문화' | '국제/외교' | '과학/기술' | '날씨/기후'

export interface RussiaNewsItem {
  id: string
  title: string
  title_original: string
  summary: string
  summary_original: string
  link: string
  published_at: string
  topic: string
  source_name: string
  source_kind: 'rss' | 'telegram' | string
  is_moscow: boolean
  views_count: number | null
}

export interface RussiaNewsApiPayload {
  items: RussiaNewsItem[]
}

export function normalizeTopic(value: string | null): RussiaNewsTopic {
  if (!value) return ''
  if (
    value === '정치/군사' ||
    value === '경제/금융' ||
    value === '사회/문화' ||
    value === '국제/외교' ||
    value === '과학/기술' ||
    value === '날씨/기후'
  ) return value
  return ''
}
