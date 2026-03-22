export type RussiaNewsTopic = '' | '정치' | '사회' | '경제' | '문화' | '날씨'

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
  if (value === '정치' || value === '사회' || value === '경제' || value === '문화' || value === '날씨') return value
  return ''
}
