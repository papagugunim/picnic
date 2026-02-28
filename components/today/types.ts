// 날씨 타입 정의
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow'

export interface WeatherData {
  condition: WeatherCondition
  temp: number
  feelsLike: number
  icon: string
}

// 환율 타입 정의
export interface ExchangeRates {
  krwToRub: number
  rubToUsd: number
  lastUpdated: string
  source?: string
}

// OHLC 데이터 타입
export interface OHLCData {
  date: string
  open: number
  high: number
  low: number
  close: number
}

// 뉴스 타입
export interface NewsItem {
  id: string
  title: string
  content: string
  summary: string | null
  author_id: string
  is_published: boolean
  created_at: string
  updated_at: string
}

// 차트 기간 타입
export type ChartPeriod = 'week' | 'month' | 'quarter' | 'year'

// 차트 통화 타입
export type ChartType = 'rub' | 'usd'

// 차트 시각화 타입
export type ChartViewMode = 'line' | 'candle'

// 뉴스 폼 데이터
export interface NewsFormData {
  title: string
  content: string
  summary: string
}
