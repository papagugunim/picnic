'use client'

import { memo, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, Calendar, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnreadCount } from '@/lib/hooks/useUnreadCount'
import { useScrollDirection } from '@/lib/hooks/useScrollDirection'
import { useUser } from '@/lib/contexts/UserContext'

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
  const router = useRouter()
  const isFullscreenPage = pathname?.match(/^\/chats\/[^/]+$/) || pathname?.match(/^\/post\/[^/]+$/) || pathname?.match(/^\/community\/[^/]+$/) || pathname === '/settings'
  const { profile } = useUser()
  const { unreadCount } = useUnreadCount(!isFullscreenPage)
  const scrollHidden = useScrollDirection({ threshold: 10, topOffset: 50, enabled: !isFullscreenPage })

  useEffect(() => {
    if (isFullscreenPage) return

    const profileHref = profile?.id ? `/profile/${profile.id}` : '/profile'
    const targets = ['/feed', '/community', '/today', '/chats', profileHref]

    let timer: ReturnType<typeof setTimeout> | null = null
    let idleHandle: number | null = null

    const prefetchNavTargets = () => {
      targets.forEach((target) => router.prefetch(target))
    }

    if ('requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(prefetchNavTargets, { timeout: 1800 })
    } else {
      timer = setTimeout(prefetchNavTargets, 700)
    }

    return () => {
      if (timer) clearTimeout(timer)
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle)
      }
    }
  }, [isFullscreenPage, profile?.id, router])

  // 채팅방, 게시글 상세 페이지에서는 네비게이션바 숨기기
  if (isFullscreenPage) {
    return null
  }

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 liquid-glass-bottom-nav transition-transform duration-300 ease-in-out ${scrollHidden ? 'translate-y-full' : 'translate-y-0'}`}>
      <div className="flex items-center justify-around h-[54px] max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const href = item.href === '/profile' && profile?.id
            ? `/profile/${profile.id}`
            : item.href
          const isActive = item.href === '/profile'
            ? pathname?.startsWith('/profile')
            : pathname?.startsWith(item.href)
          const Icon = item.icon
          const showBadge = item.href === '/chats' && unreadCount > 0

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={item.name}
            >
              <div className="relative">
                <Icon
                  className={cn('w-6 h-6', isActive && 'stroke-[2.5]')}
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
