'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  DashboardIcon,
  PersonIcon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons'

interface NavItem {
  href: string
  label: string
  shortLabel: string
  icon: typeof DashboardIcon
  developerOnly?: boolean
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: '대시보드',
    shortLabel: '대시보드',
    icon: DashboardIcon,
  },
  {
    href: '/admin/users',
    label: '회원 관리',
    shortLabel: '회원',
    icon: PersonIcon,
    developerOnly: true,
  },
  {
    href: '/admin/reports',
    label: '신고 관리',
    shortLabel: '신고',
    icon: ExclamationTriangleIcon,
  },
]

interface AdminNavProps {
  userRole: 'admin' | 'developer'
}

export function AdminNav({ userRole }: AdminNavProps) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(
    (item) => !item.developerOnly || userRole === 'developer'
  )

  return (
    <>
      {/* 데스크톱 사이드바 */}
      <nav className="hidden md:block sticky top-14 h-[calc(100vh-3.5rem)] w-48 lg:w-56 border-r bg-background p-3 lg:p-4 flex-shrink-0">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 모바일 하단 탭바 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 liquid-glass-bottom-nav">
        <ul className="flex">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 text-xs transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  <span>{item.shortLabel}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
