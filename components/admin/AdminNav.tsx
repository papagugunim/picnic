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
    icon: DashboardIcon,
  },
  {
    href: '/admin/users',
    label: '회원 관리',
    icon: PersonIcon,
  },
  {
    href: '/admin/reports',
    label: '신고 관리',
    icon: ExclamationTriangleIcon,
  },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-14 h-[calc(100vh-3.5rem)] w-56 border-r bg-background p-4">
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
  )
}
