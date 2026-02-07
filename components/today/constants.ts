import { WeatherCondition } from './types'

// 도시별 타임존 매핑
export const CITY_TIMEZONES: Record<string, string> = {
  'Moscow': 'Europe/Moscow',
  'Saint Petersburg': 'Europe/Moscow',
  'moscow': 'Europe/Moscow',
  'spb': 'Europe/Moscow'
}

// 도시 이름 한글 변환
export const CITY_NAMES_KR: Record<string, string> = {
  'Moscow': '모스크바',
  'Saint Petersburg': '상트페테르부르크',
  'moscow': '모스크바',
  'spb': '상트페테르부르크'
}

// 날씨 상태별 이모지
export const WEATHER_ICONS: Record<WeatherCondition, string> = {
  clear: '☀️',
  cloudy: '☁️',
  rain: '🌧️',
  snow: '❄️'
}

// 날씨 상태 한글
export const WEATHER_NAMES: Record<WeatherCondition, string> = {
  clear: '맑음',
  cloudy: '흐림',
  rain: '비',
  snow: '눈'
}

// 도시별 좌표
export const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'Moscow': { lat: 55.7558, lon: 37.6173 },
  'Saint Petersburg': { lat: 59.9311, lon: 30.3609 },
  'moscow': { lat: 55.7558, lon: 37.6173 },
  'spb': { lat: 59.9311, lon: 30.3609 }
}

// 유용한 링크 목록
export const USEFUL_LINKS = [
  {
    href: 'https://www.cbr.ru',
    icon: '🏦',
    label: '러시아 중앙은행'
  },
  {
    href: 'https://yandex.ru/pogoda/moscow',
    icon: '🌤️',
    label: '날씨 (Yandex)'
  },
  {
    href: 'https://overseas.mofa.go.kr/ru-ko/brd/m_7329/index.do?27778',
    icon: '🇰🇷',
    label: '주러 한국대사관'
  },
  {
    href: 'https://yandex.ru/maps',
    icon: '🗺️',
    label: '지도 (Yandex)'
  }
] as const

// 차트 기간 설정
export const CHART_PERIOD_CONFIG = {
  week: { days: 7, interval: 1, label: '1주일' },
  month: { days: 30, interval: 2, label: '1개월' },
  quarter: { days: 90, interval: 3, label: '1분기' },
  year: { days: 365, interval: 7, label: '1년' }
} as const
