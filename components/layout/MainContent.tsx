'use client'

import { usePathname } from 'next/navigation'

interface MainContentProps {
  children: React.ReactNode
}

export default function MainContent({ children }: MainContentProps) {
  const pathname = usePathname()

  // 채팅방 페이지 확인 - padding 조정용
  const isChatRoomPage = pathname?.match(/^\/chats\/[^/]+$/)

  return (
    <main className={`${isChatRoomPage ? '' : 'pt-14 pb-12'} max-w-screen-xl mx-auto`}>
      {children}
    </main>
  )
}
