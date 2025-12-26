'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { preloadAllPages } from '@/lib/preloader'

interface UserProfile {
  id: string
  full_name: string
  city: string
  avatar_url?: string
  preferred_metro_stations?: string[]
  matryoshka_level?: number
}

interface UserContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

// 프로필 캐시 (메모리)
const profileCache = new Map<string, { data: UserProfile; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5분

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPreloaded, setHasPreloaded] = useState(false)

  const fetchUserAndProfile = async (forceRefresh = false) => {
    try {
      const supabase = createClient()

      const { data: { user: userData } } = await supabase.auth.getUser()

      if (userData) {
        setUser(userData)

        // 캐시 확인
        const cached = profileCache.get(userData.id)
        const now = Date.now()

        if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
          console.log('[UserContext] Using cached profile')
          setProfile(cached.data)
        } else {
          // 캐시 미스 또는 강제 새로고침 - DB에서 가져오기
          console.log('[UserContext] Fetching profile from database')
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, city, avatar_url, preferred_metro_stations, matryoshka_level')
            .eq('id', userData.id)
            .single()

          if (profileData) {
            setProfile(profileData)
            // 캐시에 저장
            profileCache.set(userData.id, {
              data: profileData,
              timestamp: now
            })
          }
        }
      } else {
        setUser(null)
        setProfile(null)
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserAndProfile()

    // 인증 상태 변경 감지
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserAndProfile()
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
        setHasPreloaded(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 사용자 로그인 후 백그라운드 프리로딩
  useEffect(() => {
    if (user && profile && !loading && !hasPreloaded) {
      setHasPreloaded(true)
      // 백그라운드에서 실행 (페이지 로딩을 막지 않음)
      setTimeout(() => {
        preloadAllPages()
      }, 1000) // 1초 후 실행하여 초기 페이지 로딩 방해하지 않음
    }
  }, [user, profile, loading, hasPreloaded])

  const refreshProfile = async () => {
    // 강제 새로고침 (캐시 무시)
    await fetchUserAndProfile(true)
  }

  return (
    <UserContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser는 UserProvider 내부에서만 사용할 수 있습니다')
  }
  return context
}
