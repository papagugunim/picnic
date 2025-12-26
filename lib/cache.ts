/**
 * 클라이언트 사이드 캐싱 유틸리티
 * localStorage를 사용하여 API 응답을 캐시하고 TTL을 관리합니다.
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * 캐시에서 데이터 가져오기
 * @param key 캐시 키
 * @param ttl Time To Live (ms) - 기본값: 30분
 * @returns 유효한 캐시 데이터 또는 null
 */
export function getCache<T>(key: string, ttl: number = 30 * 60 * 1000): T | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const item: CacheItem<T> = JSON.parse(cached)
    const now = Date.now()

    // TTL 확인
    if (now - item.timestamp > item.ttl) {
      localStorage.removeItem(key)
      return null
    }

    return item.data
  } catch (error) {
    console.error('Cache read error:', error)
    return null
  }
}

/**
 * 캐시에 데이터 저장
 * @param key 캐시 키
 * @param data 저장할 데이터
 * @param ttl Time To Live (ms) - 기본값: 30분
 */
export function setCache<T>(key: string, data: T, ttl: number = 30 * 60 * 1000): void {
  if (typeof window === 'undefined') return

  try {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl
    }
    localStorage.setItem(key, JSON.stringify(item))
  } catch (error) {
    console.error('Cache write error:', error)
  }
}

/**
 * 캐시 삭제
 * @param key 캐시 키
 */
export function clearCache(key: string): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Cache clear error:', error)
  }
}

/**
 * 모든 캐시 삭제
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return

  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Clear all cache error:', error)
  }
}

/**
 * 캐시 키 생성 헬퍼
 */
export const CACHE_KEYS = {
  WEATHER: (city: string) => `cache_weather_${city}`,
  EXCHANGE_RATES: 'cache_exchange_rates',
  EXCHANGE_HISTORY: (currency: string) => `cache_exchange_history_${currency}`,
  POSTS: (page: number) => `cache_posts_page_${page}`,
  USER_PROFILE: (userId: string) => `cache_user_profile_${userId}`,
} as const
