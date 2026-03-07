'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useUser } from '@/lib/contexts/UserContext'
import { createNamespacedLogger } from '@/lib/logger'
import {
  markProfileViewWarmup,
  shouldWarmupProfileView,
  writeProfileViewCache,
  type ProfileViewCacheData,
} from '@/lib/profile/profile-view-cache'
import { createClient } from '@/lib/supabase/client'

const logger = createNamespacedLogger('ProfileWarmup')

function isLowBandwidthConnection() {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }
  const connection = nav.connection
  if (!connection) return false
  if (connection.saveData) return true
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'
}

export function ProfileWarmup() {
  const { user, loading } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const warmedUserIdRef = useRef<string | null>(null)
  const prefetchedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user?.id) {
      warmedUserIdRef.current = null
      prefetchedUserIdRef.current = null
      return
    }

    if (pathname?.startsWith('/profile')) {
      return
    }

    if (prefetchedUserIdRef.current !== user.id) {
      router.prefetch(`/profile/${user.id}`)
      prefetchedUserIdRef.current = user.id
    }

    if (!shouldWarmupProfileView(user.id)) {
      warmedUserIdRef.current = user.id
      return
    }

    if (warmedUserIdRef.current === user.id) {
      return
    }

    if (isLowBandwidthConnection()) {
      return
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    let idleHandle: number | null = null

    const runWarmup = () => {
      void (async () => {
        try {
          const supabase = createClient()

          const [profileResult, postsResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, full_name, avatar_url, city, created_at, email, preferred_metro_stations, bread_level, user_role, post_count')
              .eq('id', user.id)
              .single(),
            supabase
              .from('posts')
              .select('id, title, price, images, created_at, status')
              .eq('author_id', user.id)
              .order('created_at', { ascending: false })
              .limit(24),
          ])

          if (profileResult.error || !profileResult.data) {
            return
          }

          const payload: ProfileViewCacheData = {
            profile: profileResult.data,
            posts: postsResult.data || [],
            communityPosts: [],
            likedPosts: [],
            interestedPosts: [],
            breadScoreBreakdown: null,
            receivedReviews: [],
            loadedSections: {
              marketplace: true,
              community: false,
              likes: false,
              interests: false,
            },
          }

          writeProfileViewCache(user.id, payload)
          markProfileViewWarmup(user.id)
          warmedUserIdRef.current = user.id
        } catch (error) {
          logger.warn('프로필 선로딩 실패:', error)
        }
      })()
    }

    if ('requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(runWarmup, { timeout: 2400 })
    } else {
      timer = setTimeout(runWarmup, 1300)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle)
      }
    }
  }, [loading, pathname, router, user?.id])

  return null
}
