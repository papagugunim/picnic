'use client'

import { Calendar as CalendarIcon, MapPin, RefreshCw } from 'lucide-react'
import { WeatherData } from './types'
import { CITY_TIMEZONES, CITY_NAMES_KR, WEATHER_NAMES } from './constants'

interface WeatherSectionProps {
  loading: boolean
  userCity: string | null
  weather: WeatherData | null
  isRefreshingWeather: boolean
  onRefreshWeather: () => void
}

export function WeatherSection({
  loading,
  userCity,
  weather,
  isRefreshingWeather,
  onRefreshWeather,
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
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">오늘의 피크닉</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="w-4 h-4" />
              <span>{formatDate()}</span>
            </div>
          </div>
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
        </div>
      </div>
    </div>
  )
}
