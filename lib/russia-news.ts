export type RussiaNewsTopic = '' | '사회' | '경제' | '문화'

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

export const DEFAULT_RUSSIA_NEWS_BASE_URL = 'https://picnic-today-ru-news.vercel.app'

export function getRussiaNewsBaseUrl(): string {
  return (process.env.RUSSIA_NEWS_BASE_URL || DEFAULT_RUSSIA_NEWS_BASE_URL).replace(/\/$/, '')
}

export function normalizeTopic(value: string | null): RussiaNewsTopic {
  if (!value) return ''
  if (value === '사회' || value === '경제' || value === '문화') return value
  return ''
}
