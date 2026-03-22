'use client'

import { Calendar as CalendarIcon, MapPin, RefreshCw, Calculator } from 'lucide-react'
import { WeatherData, ExchangeRates } from './types'
import { CITY_TIMEZONES, CITY_NAMES_KR, WEATHER_NAMES } from './constants'

interface WeatherSectionProps {
  loading: boolean
  userCity: string | null
  weather: WeatherData | null
  isRefreshingWeather: boolean
  onRefreshWeather: () => void
  exchangeRates?: ExchangeRates | null
  isRefreshingExchangeRates?: boolean
  onRefreshExchangeRates?: () => void
  onOpenCalculator?: () => void
  onOpenRubChart?: () => void
  onOpenUsdChart?: () => void
}

export function WeatherSection({
  loading,
  userCity,
  weather,
  isRefreshingWeather,
  onRefreshWeather,
  exchangeRates,
  isRefreshingExchangeRates,
  onRefreshExchangeRates,
  onOpenCalculator,
  onOpenRubChart,
  onOpenUsdChart,
}: WeatherSectionProps) {
  const currentDate = new Date()

  const formatDate = () => {
    const timezone = userCity ? CITY_TIMEZONES[userCity] : undefined
    return currentDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      timeZone: timezone,
    })
  }

  const getCityName = () => {
    if (!userCity) return '위치 설정 필요'
    return CITY_NAMES_KR[userCity] || userCity
  }

  if (loading) {
    return (
      <div className="bg-background">
        <div className="px-4 py-2.5">
          <h1 className="text-lg font-bold mb-2">오늘의 피크닉</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="w-4 h-4 animate-pulse" />
            <span>로딩 중...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background">
      <div className="px-4 py-2.5">
        <div className="space-y-1.5">
          {/* 제목 + 날짜 */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">오늘의 피크닉</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="w-4 h-4" />
              <span>{formatDate()}</span>
            </div>
          </div>

          {/* 위치 + 날씨 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{getCityName()}</span>
            </div>
            {weather && (
              <div className="flex items-center gap-2">
                <div className="text-xl">{weather.icon}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {WEATHER_NAMES[weather.condition]}
                  </span>
                  <span className="text-sm font-bold">
                    {weather.temp > 0 ? '+' : ''}{weather.temp}°C
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (체감 {weather.feelsLike > 0 ? '+' : ''}{weather.feelsLike}°C)
                  </span>
                </div>
                <button
                  onClick={onRefreshWeather}
                  disabled={isRefreshingWeather}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                  aria-label="날씨 새로고침"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-muted-foreground ${
                      isRefreshingWeather ? 'animate-spin' : ''
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* 환율 (compact) */}
          {exchangeRates && (
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={onOpenRubChart}
                className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
              >
                <span className="text-muted-foreground">₽1</span>
                <span className="font-semibold">{(1 / exchangeRates.krwToRub).toFixed(2)}원</span>
              </button>
              <span className="text-muted-foreground/40 text-xs">|</span>
              <button
                onClick={onOpenUsdChart}
                className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
              >
                <span className="text-muted-foreground">$1</span>
                <span className="font-semibold">{(1 / exchangeRates.rubToUsd).toFixed(2)}₽</span>
              </button>
              <div className="ml-auto flex items-center gap-0.5">
                {onRefreshExchangeRates && (
                  <button
                    onClick={onRefreshExchangeRates}
                    disabled={isRefreshingExchangeRates}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                    aria-label="환율 새로고침"
                  >
                    <RefreshCw
                      className={`w-3 h-3 text-muted-foreground ${
                        isRefreshingExchangeRates ? 'animate-spin' : ''
                      }`}
                    />
                  </button>
                )}
                {onOpenCalculator && (
                  <button
                    onClick={onOpenCalculator}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    aria-label="환율 계산기"
                  >
                    <Calculator className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
