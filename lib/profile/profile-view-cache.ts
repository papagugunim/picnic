import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('ProfileViewCache')

const CACHE_VERSION = '1'
const CACHE_TTL_MS = 10 * 60 * 1000

export interface ProfileViewCachedProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  created_at: string
  email: string
  preferred_metro_stations: string[] | null
  bread_level: number
  user_role: string | null
  post_count?: number | null
}

export interface ProfileViewCachedPost {
  id: string
  title: string
  price: number
  images: string[]
  created_at: string
  status: string
}

export interface ProfileViewCachedCommunityPost {
  id: string
  title: string
  content: string
  images: string[] | null
  category: string
  created_at: string
}

export interface ProfileViewCachedBreadScoreBreakdown {
  totalScore: number
  soldCount: number
  salesScore: number
  receivedReviews: number
  averageRating: number
  reviewScore: number
  communityLikesScore: number
  suggestedLevel: number
}

export interface ProfileViewCacheData {
  profile: ProfileViewCachedProfile | null
  posts: ProfileViewCachedPost[]
  communityPosts: ProfileViewCachedCommunityPost[]
  likedPosts: ProfileViewCachedPost[]
  interestedPosts: ProfileViewCachedPost[]
  breadScoreBreakdown: ProfileViewCachedBreadScoreBreakdown | null
  loadedSections: {
    marketplace: boolean
    community: boolean
    likes: boolean
    interests: boolean
  }
}

interface StoredCacheEnvelope {
  savedAt: number
  value: ProfileViewCacheData
}

function buildCacheKey(userId: string): string {
  return `profile:view:${userId}:v${CACHE_VERSION}`
}

function buildWarmupMarkerKey(userId: string): string {
  return `profile:view:warmup:${userId}:v${CACHE_VERSION}`
}

export function readProfileViewCache(userId: string): ProfileViewCacheData | null {
  if (typeof window === 'undefined' || !userId) return null

  try {
    const raw = window.localStorage.getItem(buildCacheKey(userId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredCacheEnvelope
    if (!parsed?.savedAt || !parsed?.value) return null

    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(buildCacheKey(userId))
      return null
    }

    return parsed.value
  } catch (error) {
    logger.warn('프로필 캐시 읽기 실패:', error)
    return null
  }
}

export function writeProfileViewCache(userId: string, value: ProfileViewCacheData): void {
  if (typeof window === 'undefined' || !userId) return

  try {
    const payload: StoredCacheEnvelope = {
      savedAt: Date.now(),
      value,
    }
    window.localStorage.setItem(buildCacheKey(userId), JSON.stringify(payload))
  } catch (error) {
    logger.warn('프로필 캐시 쓰기 실패:', error)
  }
}

export function shouldWarmupProfileView(userId: string, minIntervalMs: number = 15 * 60 * 1000): boolean {
  if (typeof window === 'undefined' || !userId) return false

  const raw = window.localStorage.getItem(buildWarmupMarkerKey(userId))
  if (!raw) return true

  const lastWarmupAt = Number(raw)
  if (!Number.isFinite(lastWarmupAt)) return true

  return Date.now() - lastWarmupAt > minIntervalMs
}

export function markProfileViewWarmup(userId: string): void {
  if (typeof window === 'undefined' || !userId) return
  window.localStorage.setItem(buildWarmupMarkerKey(userId), String(Date.now()))
}
