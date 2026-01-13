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

  // 채팅방: pt-0 pb-0 (헤더/하단 메뉴 모두 숨김)
  // 일반 페이지: pt-14 pb-20 (헤더 높이 + 하단 메뉴 높이)
  const paddingClass = isChatRoomPage ? 'pt-0 pb-0' : 'pt-14 pb-20'

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
