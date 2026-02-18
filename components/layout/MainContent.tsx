'use client'

import { usePathname } from 'next/navigation'

interface MainContentProps {
  children: React.ReactNode
}

export default function MainContent({ children }: MainContentProps) {
  const pathname = usePathname()

  // 전체화면 페이지 확인 - padding 조정용
  const isFullscreenPage = pathname?.match(/^\/chats\/[^/]+$/) || pathname?.match(/^\/post\/[^/]+$/) || pathname?.match(/^\/community\/[^/]+$/) || pathname === '/settings'

  return (
    <main className={`${isFullscreenPage ? '' : 'pt-14 pb-[54px]'} max-w-screen-xl mx-auto`}>
      {children}
    </main>
  )
}
