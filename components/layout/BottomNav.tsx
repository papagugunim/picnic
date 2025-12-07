'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, MapPin, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    name: '동네지도',
    href: '/map',
    icon: MapPin,
  },
  {
    name: '채팅',
    href: '/chats',
    icon: MessageCircle,
  },
  {
    name: '나의 당근',
    href: '/profile',
    icon: User,
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                className={cn('w-6 h-6', isActive && 'stroke-[2.5]')}
                strokeWidth={isActive ? 2.5 : 2}
              />
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
