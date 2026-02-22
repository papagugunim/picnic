'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, Settings, Search, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'
import { useNotificationCount } from '@/lib/hooks/useNotificationCount'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopBarProps {
  showLocationDropdown?: boolean
}

export default function TopBar({ showLocationDropdown = false }: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, refreshProfile } = useUser()
  const { unreadCount } = useNotificationCount()

  // 스크롤 방향 감지 - 직접 구현
  const [scrollHidden, setScrollHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // 페이지 상단 근처: 항상 표시
      if (currentScrollY < 50) {
        setScrollHidden(false)
        lastScrollY.current = currentScrollY
        return
      }

      const diff = currentScrollY - lastScrollY.current

      // 10px 이상 스크롤했을 때만 방향 전환
      if (Math.abs(diff) > 10) {
        setScrollHidden(diff > 0) // 아래로 스크롤: 숨김
        lastScrollY.current = currentScrollY
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 채팅방, 게시글 상세 페이지에서는 TopBar 숨기기
  const isFullscreenPage = pathname?.match(/^\/chats\/[^/]+$/) || pathname?.match(/^\/post\/[^/]+$/) || pathname?.match(/^\/community\/[^/]+$/) || pathname === '/settings'
  if (isFullscreenPage) {
    return null
  }

  const currentCity = profile?.city
    ? (profile.city.toLowerCase() === 'moscow' ? '모스크바' : '상트페테르부르크')
    : '모스크바'

  const getCityEmoji = (city: string) => {
    return city === '모스크바' ? '🏛️' : '⛲'
  }

  const handleCityChange = async (city: string) => {
    if (!profile) return

    const supabase = createClient()
    const cityValue = city === '모스크바' ? 'moscow' : 'spb'

    await supabase
      .from('profiles')
      .update({ city: cityValue, preferred_metro_stations: [] })
      .eq('id', profile.id)

    await refreshProfile()
    router.refresh()
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 bg-background transition-transform duration-300 ease-in-out ${scrollHidden ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
        {/* 왼쪽: 지역 선택 */}
        {showLocationDropdown ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-lg font-bold hover:opacity-70 transition-opacity">
                <span>{getCityEmoji(currentCity)} {currentCity}</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleCityChange('모스크바')}>
                🏛️ 모스크바
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCityChange('상트페테르부르크')}>
                ⛲ 상트페테르부르크
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/feed">
            <h1 className="text-lg font-brand font-light hover:opacity-70 transition-opacity cursor-pointer">picnic</h1>
          </Link>
        )}

        {/* 오른쪽: 검색, 알림, 관리자, 설정 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9"
            onClick={() => router.push('/search')}
          >
            <Search className="w-5 h-5" />
            <span className="sr-only">검색</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 relative"
            onClick={() => router.push('/notifications')}
          >
            <Bell className="w-5 h-5" />
            <span className="sr-only">알림</span>
            {/* 알림 배지 */}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            )}
          </Button>

          {/* 관리자 메뉴 (admin/developer만 표시) */}
          {profile?.user_role && ['admin', 'developer'].includes(profile.user_role) && (
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9"
              onClick={() => router.push('/admin')}
            >
              <Shield className="w-5 h-5" />
              <span className="sr-only">관리자</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9"
            onClick={() => router.push('/settings')}
          >
            <Settings className="w-5 h-5" />
            <span className="sr-only">설정</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
