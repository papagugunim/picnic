'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Newspaper, Cloud, DollarSign, Calendar as CalendarIcon } from 'lucide-react'

export default function TodayPage() {
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    setCurrentDate(new Date())
  }, [])

  const formatDate = () => {
    return currentDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold mb-1">오늘의 피크닉</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="w-4 h-4" />
              <span>{formatDate()}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* 환율 정보 */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">환율</h2>
                <p className="text-xs text-muted-foreground">실시간 환율 정보</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">₩</div>
                  <div>
                    <div className="font-semibold">KRW → RUB</div>
                    <div className="text-xs text-muted-foreground">원 → 루블</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">0.075</div>
                  <div className="text-xs text-green-600 dark:text-green-400">+0.5%</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">$</div>
                  <div>
                    <div className="font-semibold">USD → RUB</div>
                    <div className="text-xs text-muted-foreground">달러 → 루블</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">95.50</div>
                  <div className="text-xs text-red-600 dark:text-red-400">-0.3%</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">€</div>
                  <div>
                    <div className="font-semibold">EUR → RUB</div>
                    <div className="text-xs text-muted-foreground">유로 → 루블</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">103.25</div>
                  <div className="text-xs text-green-600 dark:text-green-400">+0.8%</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              * 환율은 예시 데이터입니다. 실제 거래 시 확인이 필요합니다.
            </p>
          </div>

          {/* 날씨 정보 */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">날씨</h2>
                <p className="text-xs text-muted-foreground">모스크바 현재 날씨</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-5xl font-bold">-5°C</div>
                  <div className="text-muted-foreground mt-1">체감 -8°C</div>
                </div>
                <div className="text-6xl">❄️</div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">습도</div>
                  <div className="font-semibold">75%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">바람</div>
                  <div className="font-semibold">12 km/h</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">강수확률</div>
                  <div className="font-semibold">30%</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              * 날씨는 예시 데이터입니다. 실제 날씨와 다를 수 있습니다.
            </p>
          </div>

          {/* 뉴스 */}
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">러시아 소식</h2>
                <p className="text-xs text-muted-foreground">한인 커뮤니티 주요 소식</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-background rounded-xl border border-border hover:border-primary transition-colors cursor-pointer">
                <div className="font-semibold mb-1">모스크바 한인회, 설날 행사 개최 예정</div>
                <p className="text-sm text-muted-foreground mb-2">
                  다가오는 설을 맞아 한인회에서 대규모 행사를 준비하고 있습니다...
                </p>
                <div className="text-xs text-muted-foreground">2시간 전</div>
              </div>

              <div className="p-4 bg-background rounded-xl border border-border hover:border-primary transition-colors cursor-pointer">
                <div className="font-semibold mb-1">새로운 한인 마트 오픈</div>
                <p className="text-sm text-muted-foreground mb-2">
                  상트페테르부르크에 한국 식품을 전문으로 하는 마트가 새롭게...
                </p>
                <div className="text-xs text-muted-foreground">5시간 전</div>
              </div>

              <div className="p-4 bg-background rounded-xl border border-border hover:border-primary transition-colors cursor-pointer">
                <div className="font-semibold mb-1">러시아 비자 갱신 안내</div>
                <p className="text-sm text-muted-foreground mb-2">
                  2024년 비자 갱신 절차가 일부 변경되었습니다. 자세한 내용은...
                </p>
                <div className="text-xs text-muted-foreground">1일 전</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              * 뉴스는 예시 데이터입니다.
            </p>
          </div>

          {/* 유용한 링크 */}
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">유용한 링크</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <a
                href="https://www.cbr.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-background rounded-xl border border-border hover:border-primary transition-colors text-center"
              >
                <div className="text-2xl mb-2">🏦</div>
                <div className="text-sm font-medium">러시아 중앙은행</div>
              </a>

              <a
                href="https://yandex.ru/pogoda/moscow"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-background rounded-xl border border-border hover:border-primary transition-colors text-center"
              >
                <div className="text-2xl mb-2">🌤️</div>
                <div className="text-sm font-medium">날씨 (Yandex)</div>
              </a>

              <a
                href="https://www.korea.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-background rounded-xl border border-border hover:border-primary transition-colors text-center"
              >
                <div className="text-2xl mb-2">🇰🇷</div>
                <div className="text-sm font-medium">주러 한국대사관</div>
              </a>

              <a
                href="https://yandex.ru/maps"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 bg-background rounded-xl border border-border hover:border-primary transition-colors text-center"
              >
                <div className="text-2xl mb-2">🗺️</div>
                <div className="text-sm font-medium">지도 (Yandex)</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
