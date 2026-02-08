'use client'

import { memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Calendar, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnreadCount } from '@/lib/hooks/useUnreadCount'
import { useScrollDirection } from '@/lib/hooks/useScrollDirection'

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

function BottomNav() {
  const pathname = usePathname()
  const { unreadCount } = useUnreadCount()
  const scrollHidden = useScrollDirection({ threshold: 10, topOffset: 50 })

  // 채팅방 페이지에서는 네비게이션바 숨기기
  const isChatRoomPage = pathname?.match(/^\/chats\/[^/]+$/)
  if (isChatRoomPage) {
    return null
  }

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background transition-transform duration-300 ease-in-out ${scrollHidden ? 'translate-y-full' : 'translate-y-0'}`}>
      <div className="flex items-center justify-around h-12 max-w-screen-xl mx-auto">
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
                'flex flex-col items-center justify-center flex-1 h-full transition-colors relative gap-0.5',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={item.name}
            >
              <div className="relative">
                <Icon
                  className={cn('w-5 h-5', isActive && 'stroke-[2.5]')}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {showBadge && (
                  <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>
              <span className="sr-only">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default memo(BottomNav)
