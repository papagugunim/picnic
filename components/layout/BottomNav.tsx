'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Calendar, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnreadCount } from '@/lib/hooks/useUnreadCount'

const navItems = [
  {
    name: '홈',
    href: '/feed',
    icon: Home,
  },
  {
    name: '동네생활',
    href: '/community',
    icon: Users,
  },
  {
    name: '오늘',
    href: '/today',
    icon: Calendar,
  },
  {
    name: '채팅',
    href: '/chats',
    icon: MessageCircle,
  },
  {
    name: '나의 피크닉',
    href: '/profile',
    icon: User,
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { unreadCount } = useUnreadCount()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          const Icon = item.icon
          const showBadge = item.href === '/chats' && unreadCount > 0

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn('w-6 h-6', isActive && 'stroke-[2.5]')}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {showBadge && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>
              <span
                className={cn(
                  'text-xs',
                  isActive ? 'font-semibold' : 'font-normal'
                )}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
