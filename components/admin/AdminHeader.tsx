'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from '@radix-ui/react-icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface AdminHeaderProps {
  userName: string
  userRole: 'admin' | 'developer'
  avatarUrl: string | null
}

export function AdminHeader({ userName, userRole, avatarUrl }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/feed"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="text-sm">메인으로</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="font-semibold">관리자 대시보드</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{userName}</p>
            <Badge variant={userRole === 'developer' ? 'default' : 'secondary'} className="text-xs">
              {userRole === 'developer' ? '개발자' : '관리자'}
            </Badge>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl || undefined} alt={userName} />
            <AvatarFallback>{userName.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
