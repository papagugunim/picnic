'use client'

import { usePathname } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import { UserProvider } from '@/lib/contexts/UserContext'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // 채팅방 페이지에서는 하단 여백 제거
  const isChatRoomPage = pathname?.match(/^\/chats\/[^/]+$/)
  const paddingClass = isChatRoomPage ? 'pb-0' : 'pb-20'

  return (
    <UserProvider>
      <div className="min-h-screen bg-background">
        <TopBar />

        <main className={`${paddingClass} max-w-screen-xl mx-auto`}>
          {children}
        </main>

        <BottomNav />
      </div>
    </UserProvider>
  )
}
