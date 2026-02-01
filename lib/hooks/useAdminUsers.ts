'use client'

import { useState, useCallback, useRef } from 'react'
import type { UserFilters, UserRole } from '@/types/admin'

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  city: 'Moscow' | 'Saint Petersburg' | null
  user_role: UserRole | null
  bread_level: number
  created_at: string
  updated_at: string
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)

  const fetchUsers = useCallback(async (filters: UserFilters, reset = false) => {
    setIsLoading(true)

    if (reset) {
      pageRef.current = 0
    }

    const currentPage = pageRef.current

    const params = new URLSearchParams()
    params.set('page', currentPage.toString())
    if (filters.search) params.set('search', filters.search)
    if (filters.role && filters.role !== 'all') params.set('role', filters.role)
    if (filters.city && filters.city !== 'all') params.set('city', filters.city)

    try {
      const response = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        console.error('Failed to fetch users:', data.error)
        setIsLoading(false)
        return
      }

      const newUsers = data.users as AdminUser[]

      if (reset) {
        setUsers(newUsers)
      } else {
        setUsers((prev) => [...prev, ...newUsers])
      }

      pageRef.current += 1
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateUserRole = useCallback(async (
    userId: string,
    newRole: UserRole,
    currentUserRole: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole })
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error }
      }

      const levelMap: Record<UserRole, number> = {
        developer: 7,
        admin: 6,
        user: 1,
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, user_role: newRole, bread_level: levelMap[newRole] }
            : u
        )
      )

      return { success: true }
    } catch (error) {
      return { success: false, error: '네트워크 오류가 발생했습니다.' }
    }
  }, [])

  const reset = useCallback(() => {
    setUsers([])
    pageRef.current = 0
    setHasMore(true)
  }, [])

  return {
    users,
    isLoading,
    hasMore,
    fetchUsers,
    updateUserRole,
    reset,
  }
}
