/**
 * 개발 환경 전용 로깅 유틸리티
 * 프로덕션 환경에서는 자동으로 비활성화됩니다.
 */

const isDevelopment = process.env.NODE_ENV === 'development'

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

interface Logger {
  log: (...args: any[]) => void
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  debug: (...args: any[]) => void
}

/**
 * 개발 환경에서만 로그를 출력하는 로거
 */
const createLogger = (): Logger => {
  const logFunction = (level: LogLevel) => {
    return (...args: any[]) => {
      if (isDevelopment) {
        console[level](...args)
      }
    }
  }

  return {
    log: logFunction('log'),
    info: logFunction('info'),
    warn: logFunction('warn'),
    error: logFunction('error'),
    debug: logFunction('debug'),
  }
}

/**
 * 기본 로거 인스턴스
 *
 * @example
 * ```ts
 * import { logger } from '@/lib/logger'
 *
 * logger.log('일반 로그')
 * logger.info('정보 메시지')
 * logger.warn('경고 메시지')
 * logger.error('에러 메시지')
 * logger.debug('디버그 메시지')
 * ```
 */
export const logger = createLogger()

/**
 * 네임스페이스가 있는 로거 생성
 * 로그 메시지 앞에 네임스페이스가 표시됩니다.
 *
 * @param namespace - 로거의 네임스페이스
 * @returns 네임스페이스가 적용된 로거
 *
 * @example
 * ```ts
 * const cacheLogger = createNamespacedLogger('Cache')
 * cacheLogger.log('캐시 히트') // [Cache] 캐시 히트
 * ```
 */
export const createNamespacedLogger = (namespace: string): Logger => {
  const logFunction = (level: LogLevel) => {
    return (...args: any[]) => {
      if (isDevelopment) {
        console[level](`[${namespace}]`, ...args)
      }
    }
  }

  return {
    log: logFunction('log'),
    info: logFunction('info'),
    warn: logFunction('warn'),
    error: logFunction('error'),
    debug: logFunction('debug'),
  }
}

export default logger
