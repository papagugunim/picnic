'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Newspaper, Cloud, DollarSign, Calendar as CalendarIcon } from 'lucide-react'

export default function TodayPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showAllNews, setShowAllNews] = useState(false)

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
        <div className="p-4 space-y-3">
          {/* 환율 정보 */}
          <div className="glass-strong rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              <h2 className="font-bold">환율</h2>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className="text-lg">₩</div>
                  <div className="text-sm font-medium">KRW → RUB</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">0.075</div>
                  <div className="text-xs text-green-600 dark:text-green-400">+0.5%</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className="text-lg">$</div>
                  <div className="text-sm font-medium">USD → RUB</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">95.50</div>
                  <div className="text-xs text-red-600 dark:text-red-400">-0.3%</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className="text-lg">€</div>
                  <div className="text-sm font-medium">EUR → RUB</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">103.25</div>
                  <div className="text-xs text-green-600 dark:text-green-400">+0.8%</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3 text-center">
              * 예시 데이터입니다
            </p>
          </div>

          {/* 날씨 정보 */}
          <div className="glass-strong rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold">모스크바 날씨</h2>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-3xl font-bold">-5°C</div>
                  <div className="text-sm text-muted-foreground">체감 -8°C</div>
                </div>
                <div className="text-4xl">❄️</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">습도</div>
                  <div className="text-sm font-semibold">75%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">바람</div>
                  <div className="text-sm font-semibold">12km/h</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">강수</div>
                  <div className="text-sm font-semibold">30%</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2 text-center">
              * 예시 데이터입니다
            </p>
          </div>

          {/* 뉴스 */}
          <div className="glass-strong rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <h2 className="font-bold">러시아 소식</h2>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors cursor-pointer">
                <div className="text-sm font-semibold mb-1">모스크바 한인회, 설날 행사 개최 예정</div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  다가오는 설을 맞아 한인회에서 대규모 행사를 준비하고 있습니다...
                </p>
                <div className="text-xs text-muted-foreground">2시간 전</div>
              </div>

              <div className="p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors cursor-pointer">
                <div className="text-sm font-semibold mb-1">새로운 한인 마트 오픈</div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  상트페테르부르크에 한국 식품을 전문으로 하는 마트가 새롭게...
                </p>
                <div className="text-xs text-muted-foreground">5시간 전</div>
              </div>

              {showAllNews && (
                <div className="p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors cursor-pointer">
                  <div className="text-sm font-semibold mb-1">러시아 비자 갱신 안내</div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    2024년 비자 갱신 절차가 일부 변경되었습니다. 자세한 내용은...
                  </p>
                  <div className="text-xs text-muted-foreground">1일 전</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAllNews(!showAllNews)}
              className="w-full mt-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAllNews ? '접기' : '더보기'}
            </button>

            <p className="text-xs text-muted-foreground mt-2 text-center">
              * 뉴스는 예시 데이터입니다.
            </p>
          </div>

          {/* 유용한 링크 */}
          <div className="glass-strong rounded-xl p-4">
            <h2 className="font-bold mb-3">유용한 링크</h2>

            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://www.cbr.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors text-center"
              >
                <div className="text-xl mb-1">🏦</div>
                <div className="text-xs font-medium">러시아 중앙은행</div>
              </a>

              <a
                href="https://yandex.ru/pogoda/moscow"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors text-center"
              >
                <div className="text-xl mb-1">🌤️</div>
                <div className="text-xs font-medium">날씨 (Yandex)</div>
              </a>

              <a
                href="https://www.korea.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors text-center"
              >
                <div className="text-xl mb-1">🇰🇷</div>
                <div className="text-xs font-medium">주러 한국대사관</div>
              </a>

              <a
                href="https://yandex.ru/maps"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors text-center"
              >
                <div className="text-xl mb-1">🗺️</div>
                <div className="text-xs font-medium">지도 (Yandex)</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
