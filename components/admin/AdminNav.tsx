'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  DashboardIcon,
  PersonIcon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons'

const navItems = [
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
  },
  {
    href: '/admin/reports',
    label: '신고 관리',
    shortLabel: '신고',
    icon: ExclamationTriangleIcon,
  },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      {/* 데스크톱 사이드바 */}
      <nav className="hidden md:block sticky top-14 h-[calc(100vh-3.5rem)] w-48 lg:w-56 border-r bg-background p-3 lg:p-4 flex-shrink-0">
        <ul className="space-y-1">
          {navItems.map((item) => {
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
        <ul className="flex">
          {navItems.map((item) => {
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
