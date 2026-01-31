'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AdminProfile, UserFilters, UserRole } from '@/types/admin'

const PAGE_SIZE = 20

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const fetchUsers = useCallback(async (filters: UserFilters, reset = false) => {
    const supabase = createClient()
    setIsLoading(true)

    const currentPage = reset ? 0 : page
    const from = currentPage * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        city,
        user_role,
        matryoshka_level,
        is_suspended,
        suspended_at,
        suspended_by,
        suspension_reason,
        suspension_expires_at,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    if (filters.role && filters.role !== 'all') {
      query = query.eq('user_role', filters.role)
    }

    if (filters.city && filters.city !== 'all') {
      query = query.eq('city', filters.city)
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('is_suspended', filters.status === 'suspended')
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch users:', error)
      setIsLoading(false)
      return
    }

    const newUsers = (data || []) as AdminProfile[]

    if (reset) {
      setUsers(newUsers)
      setPage(1)
    } else {
      setUsers((prev) => [...prev, ...newUsers])
      setPage((prev) => prev + 1)
    }

    setHasMore(newUsers.length === PAGE_SIZE)
    setIsLoading(false)
  }, [page])

  const updateUserRole = useCallback(async (
    userId: string,
    newRole: UserRole,
    currentUserRole: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    if (currentUserRole !== 'developer' && (newRole === 'admin' || newRole === 'developer')) {
      return { success: false, error: '개발자만 admin/developer 역할을 부여할 수 있습니다.' }
    }

    const supabase = createClient()

    const levelMap: Record<UserRole, number> = {
      developer: 7,
      admin: 6,
      user: 1,
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        user_role: newRole,
        matryoshka_level: levelMap[newRole],
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, user_role: newRole, matryoshka_level: levelMap[newRole] }
          : u
      )
    )

    return { success: true }
  }, [])

  const suspendUser = useCallback(async (
    userId: string,
    reason: string,
    expiresAt?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_by: user.id,
        suspension_reason: reason,
        suspension_expires_at: expiresAt || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              is_suspended: true,
              suspended_at: new Date().toISOString(),
              suspended_by: user.id,
              suspension_reason: reason,
              suspension_expires_at: expiresAt || null,
            }
          : u
      )
    )

    return { success: true }
  }, [])

  const unsuspendUser = useCallback(async (
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
        suspension_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              is_suspended: false,
              suspended_at: null,
              suspended_by: null,
              suspension_reason: null,
              suspension_expires_at: null,
            }
          : u
      )
    )

    return { success: true }
  }, [])

  const reset = useCallback(() => {
    setUsers([])
    setPage(0)
    setHasMore(true)
  }, [])

  return {
    users,
    isLoading,
    hasMore,
    fetchUsers,
    updateUserRole,
    suspendUser,
    unsuspendUser,
    reset,
  }
}
