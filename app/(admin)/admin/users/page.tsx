'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@/lib/contexts/UserContext'
import { useAdminUsers } from '@/lib/hooks/useAdminUsers'
import { UserTable } from '@/components/admin/UserTable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MagnifyingGlassIcon, ReloadIcon } from '@radix-ui/react-icons'
import type { UserFilters, UserRole } from '@/types/admin'
import { createClient } from '@/lib/supabase/client'

export default function AdminUsersPage() {
  const { user } = useUser()
  const {
    users,
    isLoading,
    hasMore,
    fetchUsers,
    updateUserRole,
    suspendUser,
    unsuspendUser,
    reset,
  } = useAdminUsers()

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('user')
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    city: 'all',
    status: 'all',
  })
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      if (!user) return
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single()

      if (data?.user_role) {
        setCurrentUserRole(data.user_role as UserRole)
      }
    }
    fetchCurrentUserRole()
  }, [user])

  useEffect(() => {
    fetchUsers(filters, true)
  }, [filters])

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: searchInput }))
  }, [searchInput])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchUsers(filters)
    }
  }, [isLoading, hasMore, fetchUsers, filters])

  const handleRoleChange = useCallback(async (userId: string, newRole: UserRole) => {
    return updateUserRole(userId, newRole, currentUserRole)
  }, [updateUserRole, currentUserRole])

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">회원 관리</h2>
        <p className="text-sm md:text-base text-muted-foreground">회원 검색, 역할 변경, 계정 정지/해제를 관리합니다.</p>
      </div>

      {/* 모바일 필터 */}
      <div className="md:hidden space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="이름/이메일 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} variant="secondary" size="icon">
            <MagnifyingGlassIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.role || 'all'}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, role: value as UserRole | 'all' }))}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="역할" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 역할</SelectItem>
              <SelectItem value="user">사용자</SelectItem>
              <SelectItem value="admin">관리자</SelectItem>
              <SelectItem value="developer">개발자</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.city || 'all'}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, city: value as 'Moscow' | 'Saint Petersburg' | 'all' }))}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="도시" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 도시</SelectItem>
              <SelectItem value="Moscow">모스크바</SelectItem>
              <SelectItem value="Saint Petersburg">상트</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value as 'active' | 'suspended' | 'all' }))}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="active">활성</SelectItem>
              <SelectItem value="suspended">정지</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 데스크톱 필터 */}
      <div className="hidden md:flex flex-wrap gap-4">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            placeholder="이름 또는 이메일로 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="max-w-sm"
          />
          <Button onClick={handleSearch} variant="secondary">
            <MagnifyingGlassIcon className="h-4 w-4" />
          </Button>
        </div>

        <Select
          value={filters.role || 'all'}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, role: value as UserRole | 'all' }))}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="역할" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 역할</SelectItem>
            <SelectItem value="user">사용자</SelectItem>
            <SelectItem value="admin">관리자</SelectItem>
            <SelectItem value="developer">개발자</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.city || 'all'}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, city: value as 'Moscow' | 'Saint Petersburg' | 'all' }))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="도시" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 도시</SelectItem>
            <SelectItem value="Moscow">모스크바</SelectItem>
            <SelectItem value="Saint Petersburg">상트페테르부르크</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value as 'active' | 'suspended' | 'all' }))}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="active">활성</SelectItem>
            <SelectItem value="suspended">정지됨</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {users.length === 0 && !isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          검색 결과가 없습니다.
        </div>
      ) : (
        <>
          <UserTable
            users={users}
            currentUserId={user?.id || ''}
            currentUserRole={currentUserRole}
            onUpdateRole={handleRoleChange}
            onSuspend={suspendUser}
            onUnsuspend={unsuspendUser}
          />

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                    불러오는 중...
                  </>
                ) : (
                  '더 불러오기'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {isLoading && users.length === 0 && (
        <div className="flex justify-center py-12">
          <ReloadIcon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
