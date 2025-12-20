/**
 * 인메모리 캐시 시스템
 * Redis 대신 경량 인메모리 캐시 사용 (Vercel Serverless 환경에 최적화)
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // 5분마다 만료된 항목 정리
    if (typeof window === 'undefined') {
      // 서버 사이드에서만 실행
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 5 * 60 * 1000)
    }
  }

  /**
   * 캐시에 값 저장
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.cache.set(key, { value, expiresAt })
  }

  /**
   * 캐시에서 값 가져오기
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // 만료 확인
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  /**
   * 캐시에서 값 삭제
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 패턴에 맞는 모든 키 삭제
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * 캐시 전체 삭제
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 만료된 항목 정리
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))

    if (keysToDelete.length > 0) {
      console.log(`[Cache] Cleaned up ${keysToDelete.length} expired entries`)
    }
  }

  /**
   * 캐시 상태 정보
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * 정리 타이머 종료
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.cache.clear()
  }
}

// 싱글톤 인스턴스
export const cache = new MemoryCache()

/**
 * 캐시 헬퍼 함수: 캐시가 없으면 함수 실행 후 캐시
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // 캐시 확인
  const cached = cache.get<T>(key)
  if (cached !== null) {
    console.log(`[Cache] HIT: ${key}`)
    return cached
  }

  // 캐시 미스 - 데이터 fetch
  console.log(`[Cache] MISS: ${key}`)
  const data = await fetchFn()

  // 캐시 저장
  cache.set(key, data, ttlSeconds)

  return data
}
