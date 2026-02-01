'use client'

import { UserProvider } from '@/lib/contexts/UserContext'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminNav } from '@/components/admin/AdminNav'

interface AdminLayoutClientProps {
  children: React.ReactNode
  userName: string
  userRole: 'admin' | 'developer'
  avatarUrl: string | null
}

export function AdminLayoutClient({
  children,
  userName,
  userRole,
  avatarUrl,
}: AdminLayoutClientProps) {
  return (
    <UserProvider>
      <div className="min-h-screen bg-muted/30">
        <AdminHeader
          userName={userName}
          userRole={userRole}
          avatarUrl={avatarUrl}
        />
        <div className="flex">
          <AdminNav />
          <main className="flex-1 p-3 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  )
}
