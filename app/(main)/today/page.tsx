'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCache, setCache, clearCache, CACHE_KEYS } from '@/lib/cache'
import { usePageVisibility } from '@/lib/hooks/usePageVisibility'
import { WeatherSection } from '@/components/today/WeatherSection'
import { ExchangeSection } from '@/components/today/ExchangeSection'
import { NewsSection } from '@/components/today/NewsSection'
import { RussiaNewsSection } from '@/components/today/RussiaNewsSection'
import { WEATHER_ICONS, CITY_COORDS, USEFUL_LINKS } from '@/components/today/constants'
import type { WeatherData, WeatherCondition, ExchangeRates, OHLCData, NewsItem } from '@/components/today/types'

export default function TodayPage() {
  const isPageVisible = usePageVisibility(true)
  const wasPageVisibleRef = useRef<boolean>(isPageVisible)
  const [userCity, setUserCity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  const [isRefreshingWeather, setIsRefreshingWeather] = useState(false)
  const [isRefreshingExchangeRates, setIsRefreshingExchangeRates] = useState(false)
  const [canManageNotices, setCanManageNotices] = useState(false)

  // 뉴스 상태
  const [newsList, setNewsList] = useState<NewsItem[]>([])

  // 환율 차트 상태
  const [chartData, setChartData] = useState<OHLCData[]>([])
  const [isLoadingChart, setIsLoadingChart] = useState(false)
  const [yearlyChartData, setYearlyChartData] = useState<{
    rub: OHLCData[]
    usd: OHLCData[]
  }>({ rub: [], usd: [] })

  // 환율 데이터 가져오기 함수
  const fetchExchangeRates = useCallback(async (forceRefresh: boolean = false) => {
    try {
      if (!forceRefresh) {
        const cached = getCache<ExchangeRates>(CACHE_KEYS.EXCHANGE_RATES, 15 * 60 * 1000)
        if (cached) {
          logger.log('환율 데이터 캐시 히트')
          setExchangeRates(cached)
          return
        }
      } else {
        clearCache(CACHE_KEYS.EXCHANGE_RATES)
        logger.log('환율 데이터 강제 새로고침')
      }

      const response = await fetch('/api/exchange-rates')

      if (!response.ok) {
        throw new Error('환율 정보를 가져올 수 없습니다')
      }

      const data = await response.json()

      const rates = {
        krwToRub: data.krwToRub,
        rubToUsd: data.rubToUsd,
        lastUpdated: new Date(data.lastUpdated).toLocaleString('ko-KR'),
        source: data.source,
      }

      setCache(CACHE_KEYS.EXCHANGE_RATES, rates, 15 * 60 * 1000)
      setExchangeRates(rates)

      logger.log(
        '환율 출처:',
        data.source === 'naver'
          ? '네이버 금융'
          : data.source === 'api' || data.source === 'exchangerate-api'
          ? 'ExchangeRate API'
          : '대체 API'
      )
    } catch (error) {
      logger.error('환율 정보 가져오기 실패:', error)
      setExchangeRates({
        krwToRub: 0.0547,
        rubToUsd: 0.0127,
        lastUpdated: new Date().toLocaleString('ko-KR'),
      })
    }
  }, [])

  // 뉴스 데이터 가져오기 함수
  const fetchNews = useCallback(async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        clearCache(CACHE_KEYS.TODAY_NOTICES)
      } else {
        const cached = getCache<NewsItem[]>(CACHE_KEYS.TODAY_NOTICES, 10 * 60 * 1000)
        if (cached && cached.length > 0) {
          setNewsList(cached)
          return
        }
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      const next = data || []
      setNewsList(next)
      if (next.length > 0) {
        setCache(CACHE_KEYS.TODAY_NOTICES, next, 10 * 60 * 1000)
      }
    } catch (error) {
      logger.error('뉴스 가져오기 실패:', error)
    }
  }, [])

  // 날씨 데이터 가져오기 함수
  const fetchWeatherData = useCallback(async (city: string, forceRefresh: boolean = false) => {
    try {
      if (!forceRefresh) {
        const cached = getCache<WeatherData>(CACHE_KEYS.WEATHER(city), 10 * 60 * 1000)
        if (cached) {
          logger.log('날씨 데이터 캐시 히트:', city)
          setWeather(cached)
          return
        }
      } else {
        clearCache(CACHE_KEYS.WEATHER(city))
        logger.log('날씨 데이터 강제 새로고침:', city)
      }

      const coords = CITY_COORDS[city]
      if (!coords) return

      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
      if (!apiKey || apiKey === 'your-api-key-here') {
        logger.warn('OpenWeatherMap API 키가 설정되지 않았습니다. 예시 데이터를 사용합니다.')
        const month = new Date().getMonth() + 1
        let condition: WeatherCondition = 'snow'
        let temp = -8
        let feelsLike = -12

        if (month >= 3 && month <= 5) {
          condition = 'cloudy'
          temp = 12
          feelsLike = 10
        } else if (month >= 6 && month <= 8) {
          condition = 'clear'
          temp = 24
          feelsLike = 26
        } else if (month >= 9 && month <= 11) {
          condition = 'rain'
          temp = 8
          feelsLike = 6
        }

        setWeather({ condition, temp, feelsLike, icon: WEATHER_ICONS[condition] })
        return
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric&lang=kr`
      )

      if (!response.ok) {
        throw new Error('날씨 정보를 가져올 수 없습니다')
      }

      const data = await response.json()

      let condition: WeatherCondition = 'clear'
      const weatherId = data.weather[0].id

      if (weatherId >= 200 && weatherId < 600) {
        condition = 'rain'
      } else if (weatherId >= 600 && weatherId < 700) {
        condition = 'snow'
      } else if (weatherId >= 800 && weatherId < 900) {
        condition = weatherId === 800 ? 'clear' : 'cloudy'
      }

      const weatherData: WeatherData = {
        condition,
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        icon: WEATHER_ICONS[condition],
      }

      setCache(CACHE_KEYS.WEATHER(city), weatherData, 10 * 60 * 1000)
      setWeather(weatherData)
    } catch (error) {
      logger.error('날씨 정보 가져오기 실패:', error)
      setWeather({
        condition: 'cloudy',
        temp: 0,
        feelsLike: -2,
        icon: WEATHER_ICONS['cloudy'],
      })
    }
  }, [])

  useEffect(() => {
    const fetchUserCity = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('city, user_role')
          .eq('id', user.id)
          .single()

        if (profile?.city) {
          setUserCity(profile.city)
          fetchWeatherData(profile.city)
        }

        if (profile?.user_role === 'admin' || profile?.user_role === 'developer') {
          setCanManageNotices(true)
        }
      }
      setLoading(false)
    }

    void fetchUserCity()
    void fetchExchangeRates()
    void fetchNews()
  }, [fetchWeatherData, fetchExchangeRates, fetchNews])

  useEffect(() => {
    if (!userCity || !isPageVisible) return

    const weatherInterval = setInterval(() => {
      logger.log('자동 날씨 업데이트 실행')
      fetchWeatherData(userCity, true)
    }, 10 * 60 * 1000)

    return () => {
      clearInterval(weatherInterval)
    }
  }, [userCity, fetchWeatherData, isPageVisible])

  useEffect(() => {
    if (!isPageVisible) return

    const exchangeRatesInterval = setInterval(() => {
      logger.log('자동 환율 업데이트 실행')
      fetchExchangeRates(true)
    }, 15 * 60 * 1000)

    return () => {
      clearInterval(exchangeRatesInterval)
    }
  }, [fetchExchangeRates, isPageVisible])

  useEffect(() => {
    const wasVisible = wasPageVisibleRef.current
    wasPageVisibleRef.current = isPageVisible

    if (!isPageVisible || wasVisible) return
    if (userCity) {
      void fetchWeatherData(userCity)
    }
    void fetchExchangeRates()
  }, [isPageVisible, userCity, fetchWeatherData, fetchExchangeRates])

  // 수동 날씨 새로고침
  const handleRefreshWeather = async () => {
    if (!userCity || isRefreshingWeather) return

    setIsRefreshingWeather(true)
    try {
      await fetchWeatherData(userCity, true)
    } finally {
      setIsRefreshingWeather(false)
    }
  }

  // 수동 환율 새로고침
  const handleRefreshExchangeRates = async () => {
    if (isRefreshingExchangeRates) return

    setIsRefreshingExchangeRates(true)
    try {
      await fetchExchangeRates(true)
    } finally {
      setIsRefreshingExchangeRates(false)
    }
  }

  // 기간별 데이터 필터링 및 샘플링
  const filterDataByPeriod = useCallback((data: OHLCData[], period: 'week' | 'month' | 'quarter' | 'year') => {
    const config = {
      week: { days: 7, interval: 1 },
      month: { days: 30, interval: 2 },
      quarter: { days: 90, interval: 3 },
      year: { days: 365, interval: 7 },
    }

    const { days, interval } = config[period]
    const filtered = data.slice(-days)

    if (interval === 1) return filtered
    return filtered.filter((_, index) => index % interval === 0)
  }, [])

  // 환율 그래프 데이터 로드
  const loadChartData = useCallback(async (type: 'rub' | 'usd', period: 'week' | 'month' | 'quarter' | 'year') => {
    if (yearlyChartData[type].length > 0) {
      const filtered = filterDataByPeriod(yearlyChartData[type], period)
      setChartData(filtered)
      return
    }

    const cached = getCache<OHLCData[]>(
      CACHE_KEYS.EXCHANGE_HISTORY(type),
      24 * 60 * 60 * 1000
    )
    if (cached && cached.length > 0) {
      logger.log('환율 히스토리 캐시 히트:', type)
      setYearlyChartData(prev => ({ ...prev, [type]: cached }))
      const filtered = filterDataByPeriod(cached, period)
      setChartData(filtered)
      return
    }

    setIsLoadingChart(true)
    try {
      const response = await fetch(`/api/exchange-rates/history?currency=${type}`)

      if (!response.ok) {
        throw new Error('환율 히스토리 데이터를 가져올 수 없습니다')
      }

      const result = await response.json()
      const yearData = result.data || []

      setYearlyChartData(prev => ({ ...prev, [type]: yearData }))
      setCache(CACHE_KEYS.EXCHANGE_HISTORY(type), yearData, 24 * 60 * 60 * 1000)

      const filtered = filterDataByPeriod(yearData, period)
      setChartData(filtered)

      if (result.fallback || result.error) {
        logger.warn('환율 히스토리: 대체 데이터 사용 중')
      }
    } catch (error) {
      logger.error('환율 히스토리 로드 실패:', error)
      setChartData([])
    } finally {
      setIsLoadingChart(false)
    }
  }, [yearlyChartData, filterDataByPeriod])

  return (
    <div className="bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header + Weather */}
        <WeatherSection
          loading={loading}
          userCity={userCity}
          weather={weather}
          isRefreshingWeather={isRefreshingWeather}
          onRefreshWeather={handleRefreshWeather}
        />

        {/* Content */}
        <div className="px-4 pt-1 pb-4 space-y-2">
          {/* 환율 정보 */}
          <ExchangeSection
            exchangeRates={exchangeRates}
            isRefreshingExchangeRates={isRefreshingExchangeRates}
            onRefreshExchangeRates={handleRefreshExchangeRates}
            loadChartData={loadChartData}
            chartData={chartData}
            isLoadingChart={isLoadingChart}
          />

          {/* 뉴스 */}
          <NewsSection
            newsList={newsList}
            canManageNotices={canManageNotices}
            onRefreshNews={fetchNews}
          />

          {/* 모스크바 실시간 뉴스 임베드 */}
          <RussiaNewsSection />

          {/* 유용한 링크 */}
          <div className="rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h2 className="font-bold text-sm">유용한 링크</h2>
            </div>

            <div className="space-y-1">
              {USEFUL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{link.icon}</span>
                    <span className="text-sm font-medium">{link.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
