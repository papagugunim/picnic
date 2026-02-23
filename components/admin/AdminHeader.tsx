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
    <header className="sticky top-0 z-50 liquid-glass-topbar">
      <div className="flex h-12 md:h-14 items-center justify-between px-3 md:px-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            href="/feed"
            className="flex items-center gap-1 md:gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="text-xs md:text-sm hidden sm:inline">메인으로</span>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <h1 className="font-semibold text-sm md:text-base">관리자</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{userName}</p>
          </div>
          <Badge variant={userRole === 'developer' ? 'default' : 'secondary'} className="text-xs">
            {userRole === 'developer' ? '개발자' : '관리자'}
          </Badge>
          <Avatar className="h-7 w-7 md:h-8 md:w-8">
            <AvatarImage src={avatarUrl || undefined} alt={userName} />
            <AvatarFallback className="text-xs">{userName.slice(0, 2)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
