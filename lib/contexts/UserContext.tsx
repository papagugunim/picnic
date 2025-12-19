'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

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

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserAndProfile = async () => {
    try {
      const supabase = createClient()

      const { data: { user: userData } } = await supabase.auth.getUser()

      if (userData) {
        setUser(userData)

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, city, avatar_url, preferred_metro_stations, matryoshka_level')
          .eq('id', userData.id)
          .single()

        if (profileData) {
          setProfile(profileData)
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
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const refreshProfile = async () => {
    await fetchUserAndProfile()
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
