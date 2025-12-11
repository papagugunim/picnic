'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
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
  const [currentCity, setCurrentCity] = useState<string>('모스크바')
  const [hasNotifications, setHasNotifications] = useState(true) // TODO: 실제 알림 데이터로 교체

  const getCityEmoji = (city: string) => {
    return city === '모스크바' ? '🏛️' : '⛲'
  }

  useEffect(() => {
    async function fetchUserCity() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('city')
          .eq('id', user.id)
          .single()

        if (profile?.city) {
          const cityName = profile.city.toLowerCase() === 'moscow' ? '모스크바' : '상트페테르부르크'
          setCurrentCity(cityName)
        }
      }
    }

    fetchUserCity()
  }, [])

  const handleCityChange = async (city: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const cityValue = city === '모스크바' ? 'moscow' : 'spb'
      await supabase
        .from('profiles')
        .update({ city: cityValue, preferred_metro_stations: [] })
        .eq('id', user.id)

      setCurrentCity(city)
      router.refresh()
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
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
            <h1 className="text-lg font-bold hover:opacity-70 transition-opacity cursor-pointer">피크닉</h1>
          </Link>
        )}

        {/* 오른쪽: 검색, 알림, 메뉴 */}
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
            {hasNotifications && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9"
            onClick={() => router.push('/settings')}
          >
            <Menu className="w-5 h-5" />
            <span className="sr-only">메뉴</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
