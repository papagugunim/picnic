'use client'

import { Bell, Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopBarProps {
  location?: string
  showLocationDropdown?: boolean
}

export default function TopBar({ location = '동탄6동', showLocationDropdown = true }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
        {/* 왼쪽: 지역 선택 */}
        {showLocationDropdown ? (
          <button className="flex items-center gap-1 text-lg font-bold hover:opacity-70 transition-opacity">
            <span>{location}</span>
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
        ) : (
          <h1 className="text-lg font-bold">picnic</h1>
        )}

        {/* 오른쪽: 검색, 알림, 메뉴 */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="w-9 h-9">
            <Search className="w-5 h-5" />
            <span className="sr-only">검색</span>
          </Button>

          <Button variant="ghost" size="icon" className="w-9 h-9 relative">
            <Bell className="w-5 h-5" />
            <span className="sr-only">알림</span>
            {/* 알림 배지 */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </Button>

          <Button variant="ghost" size="icon" className="w-9 h-9">
            <Menu className="w-5 h-5" />
            <span className="sr-only">메뉴</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
