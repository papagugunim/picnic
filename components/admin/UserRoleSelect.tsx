'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { UserRole } from '@/types/admin'

interface UserRoleSelectProps {
  currentRole: UserRole
  currentUserRole: UserRole
  onRoleChange: (newRole: UserRole) => Promise<{ success: boolean; error?: string }>
}

export function UserRoleSelect({
  currentRole,
  currentUserRole,
  onRoleChange,
}: UserRoleSelectProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [role, setRole] = useState<UserRole>(currentRole)

  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === role) return

    setIsUpdating(true)
    const result = await onRoleChange(newRole)

    if (result.success) {
      setRole(newRole)
      toast.success('역할이 변경되었습니다.')
    } else {
      toast.error(result.error || '역할 변경에 실패했습니다.')
    }

    setIsUpdating(false)
  }

  const canAssignAdmin = currentUserRole === 'developer'

  return (
    <Select
      value={role}
      onValueChange={(value) => handleRoleChange(value as UserRole)}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-[120px] h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">사용자</SelectItem>
        <SelectItem value="admin" disabled={!canAssignAdmin}>
          관리자
        </SelectItem>
        <SelectItem value="developer" disabled={!canAssignAdmin}>
          개발자
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
