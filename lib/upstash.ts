import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null

let redisClient: Redis | null | undefined
const ratelimitCache = new Map<string, Ratelimit>()

function getRedisClient() {
  if (redisClient !== undefined) return redisClient

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    redisClient = null
    return redisClient
  }

  redisClient = new Redis({ url, token })
  return redisClient
}

function getRatelimit(routeKey: string, limit: number, windowSeconds: number) {
  const redis = getRedisClient()
  if (!redis) return null

  const key = `${routeKey}:${limit}:${windowSeconds}`
  const existing = ratelimitCache.get(key)
  if (existing) return existing

  const next = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: false,
    prefix: `picnic:${routeKey}`,
  })

  ratelimitCache.set(key, next)
  return next
}

export async function getUpstashJson<T extends JsonValue>(key: string): Promise<T | null> {
  const redis = getRedisClient()
  if (!redis) return null

  try {
    const value = await redis.get<T>(key)
    return value ?? null
  } catch {
    return null
  }
}

export async function setUpstashJson(key: string, value: JsonValue, ttlSeconds: number) {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.set(key, value, { ex: ttlSeconds })
  } catch {
    // cache write error should not break response
  }
}

export async function checkUpstashRateLimit(
  routeKey: string,
  identifier: string,
  limit = 120,
  windowSeconds = 60
) {
  const limiter = getRatelimit(routeKey, limit, windowSeconds)
  if (!limiter) {
    return {
      success: true,
      remaining: limit,
      reset: Date.now() + (windowSeconds * 1000),
      limited: false,
    }
  }

  const result = await limiter.limit(identifier)
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
    limited: !result.success,
  }
}

export function getRateLimitIdentifier(headers: Headers, fallback = 'anonymous') {
  const forwardedFor = headers.get('x-forwarded-for') || headers.get('cf-connecting-ip')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || fallback
  }
  return fallback
}

