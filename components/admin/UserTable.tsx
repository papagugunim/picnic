'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserRoleSelect } from './UserRoleSelect'
import { SuspendUserDialog } from './SuspendUserDialog'
import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import type { AdminProfile, UserRole } from '@/types/admin'

interface UserTableProps {
  users: AdminProfile[]
  currentUserId: string
  currentUserRole: UserRole
  onUpdateRole: (userId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>
  onSuspend: (userId: string, reason: string, expiresAt?: string) => Promise<{ success: boolean; error?: string }>
  onUnsuspend: (userId: string) => Promise<{ success: boolean; error?: string }>
}

export function UserTable({
  users,
  currentUserId,
  currentUserRole,
  onUpdateRole,
  onSuspend,
  onUnsuspend,
}: UserTableProps) {
  const [suspendDialogUser, setSuspendDialogUser] = useState<AdminProfile | null>(null)

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'developer':
        return 'default'
      case 'admin':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'developer':
        return '개발자'
      case 'admin':
        return '관리자'
      default:
        return '사용자'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
    })
  }

  return (
    <>
      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-2">
        {users.map((user) => {
          const isSelf = user.id === currentUserId
          const canModify = !isSelf && (user.user_role !== 'developer' || currentUserRole === 'developer')

          return (
            <div key={user.id} className="bg-card border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{(user.full_name || '?').slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm truncate">{user.full_name || '이름 없음'}</span>
                      {isSelf && <span className="text-xs text-muted-foreground">(나)</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSelf}>
                      <DotsHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>액션</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.is_suspended ? (
                      <DropdownMenuItem
                        onClick={() => onUnsuspend(user.id)}
                        disabled={!canModify}
                      >
                        정지 해제
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => setSuspendDialogUser(user)}
                        disabled={!canModify}
                        className="text-destructive"
                      >
                        계정 정지
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {canModify ? (
                  <UserRoleSelect
                    currentRole={user.user_role || 'user'}
                    currentUserRole={currentUserRole}
                    onRoleChange={(newRole) => onUpdateRole(user.id, newRole)}
                  />
                ) : (
                  <Badge variant={getRoleBadgeVariant(user.user_role)} className="text-xs">
                    {getRoleLabel(user.user_role)}
                  </Badge>
                )}
                {user.is_suspended ? (
                  <Badge variant="destructive" className="text-xs">정지</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">활성</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {user.city === 'Moscow' ? '모스크바' : user.city === 'Saint Petersburg' ? '상트' : '-'}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDate(user.created_at)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden md:block rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                프로필
              </th>
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                이메일
              </th>
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                역할
              </th>
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                도시
              </th>
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                상태
              </th>
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                가입일
              </th>
              <th className="h-10 px-4 text-right text-sm font-medium text-muted-foreground">
                액션
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId
              const canModify = !isSelf && (user.user_role !== 'developer' || currentUserRole === 'developer')

              return (
                <tr key={user.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{(user.full_name || '?').slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.full_name || '이름 없음'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="p-4">
                    {canModify ? (
                      <UserRoleSelect
                        currentRole={user.user_role || 'user'}
                        currentUserRole={currentUserRole}
                        onRoleChange={(newRole) => onUpdateRole(user.id, newRole)}
                      />
                    ) : (
                      <Badge variant={getRoleBadgeVariant(user.user_role)}>
                        {getRoleLabel(user.user_role)}
                        {isSelf && ' (나)'}
                      </Badge>
                    )}
                  </td>
                  <td className="p-4 text-sm">
                    {user.city === 'Moscow' ? '모스크바' : user.city === 'Saint Petersburg' ? '상트페테르부르크' : '-'}
                  </td>
                  <td className="p-4">
                    {user.is_suspended ? (
                      <Badge variant="destructive">정지됨</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">활성</Badge>
                    )}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isSelf}>
                          <DotsHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>액션</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {user.is_suspended ? (
                          <DropdownMenuItem
                            onClick={() => onUnsuspend(user.id)}
                            disabled={!canModify}
                          >
                            정지 해제
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setSuspendDialogUser(user)}
                            disabled={!canModify}
                            className="text-destructive"
                          >
                            계정 정지
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {suspendDialogUser && (
        <SuspendUserDialog
          user={suspendDialogUser}
          open={!!suspendDialogUser}
          onOpenChange={(open) => !open && setSuspendDialogUser(null)}
          onSuspend={async (reason, expiresAt) => {
            const result = await onSuspend(suspendDialogUser.id, reason, expiresAt)
            if (result.success) {
              setSuspendDialogUser(null)
            }
            return result
          }}
        />
      )}
    </>
  )
}
