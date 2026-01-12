'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('UserContext')
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
// import { preloadAllPages } from '@/lib/preloader' // 비활성화

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
const STORAGE_KEY = 'picnic_user_profile'

// localStorage에서 프로필 로드
function loadProfileFromStorage(userId: string): UserProfile | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const { data, userId: storedUserId, timestamp } = JSON.parse(stored)

    // 같은 사용자이고 캐시가 유효한 경우
    if (storedUserId === userId && (Date.now() - timestamp) < CACHE_TTL) {
      logger.log('[UserContext] Using localStorage cached profile')
      return data
    }
  } catch (error) {
    logger.error('[UserContext] Failed to load from localStorage:', error)
  }

  return null
}

// localStorage에 프로필 저장
function saveProfileToStorage(userId: string, data: UserProfile) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      userId,
      data,
      timestamp: Date.now()
    }))
  } catch (error) {
    logger.error('[UserContext] Failed to save to localStorage:', error)
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  // const [hasPreloaded, setHasPreloaded] = useState(false) // 비활성화

  const fetchUserAndProfile = async (forceRefresh = false) => {
    try {
      const supabase = createClient()

      const { data: { user: userData } } = await supabase.auth.getUser()

      if (userData) {
        setUser(userData)

        // 1. localStorage 캐시 확인 (가장 빠름)
        if (!forceRefresh) {
          const storageProfile = loadProfileFromStorage(userData.id)
          if (storageProfile) {
            setProfile(storageProfile)
            setLoading(false) // 즉시 로딩 완료

            // 백그라운드에서 업데이트 체크
            setTimeout(() => {
              fetchUserAndProfile(true)
            }, 2000)
            return
          }
        }

        // 2. 메모리 캐시 확인
        const cached = profileCache.get(userData.id)
        const now = Date.now()

        if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
          logger.log('[UserContext] Using memory cached profile')
          setProfile(cached.data)
        } else {
          // 3. DB에서 가져오기
          logger.log('[UserContext] Fetching profile from database')
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, city, avatar_url, preferred_metro_stations, matryoshka_level')
            .eq('id', userData.id)
            .single()

          if (profileData) {
            setProfile(profileData)

            // 메모리 캐시에 저장
            profileCache.set(userData.id, {
              data: profileData,
              timestamp: now
            })

            // localStorage에 저장
            saveProfileToStorage(userData.id, profileData)
          }
        }
      } else {
        setUser(null)
        setProfile(null)
        // 로그아웃 시 localStorage 캐시 삭제
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (error) {
      logger.error('사용자 정보 로드 실패:', error)
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
        // setHasPreloaded(false) // 비활성화
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 백그라운드 프리로딩 비활성화 - 페이지 로딩 속도 개선
  // 필요한 데이터는 각 페이지에서 로드하도록 변경
  // useEffect(() => {
  //   if (user && profile && !loading && !hasPreloaded) {
  //     setHasPreloaded(true)
  //     setTimeout(() => {
  //       preloadAllPages()
  //     }, 5000) // 5초 후로 지연
  //   }
  // }, [user, profile, loading, hasPreloaded])

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
