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

  // 채팅방 페이지 확인
  const isChatRoomPage = pathname?.match(/^\/chats\/[^/]+$/)

  return (
    <UserProvider>
      <div className="min-h-screen bg-background">
        <TopBar />

        <main className={`${isChatRoomPage ? '' : 'pt-14 pb-12'} max-w-screen-xl mx-auto`}>
          {children}
        </main>

        <BottomNav />
      </div>
    </UserProvider>
  )
}
