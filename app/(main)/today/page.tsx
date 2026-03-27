'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Link2 } from 'lucide-react'
import { getCache, setCache, clearCache, CACHE_KEYS } from '@/lib/cache'
import { useUser } from '@/lib/contexts/UserContext'
import { usePageVisibility } from '@/lib/hooks/usePageVisibility'
import { WeatherSection } from '@/components/today/WeatherSection'
import { WEATHER_ICONS, CITY_COORDS, USEFUL_LINKS } from '@/components/today/constants'
import type { WeatherData, WeatherCondition, ExchangeRates, OHLCData, ChartType, ChartPeriod } from '@/components/today/types'

const ExchangeCalculatorModal = dynamic(
  () => import('@/components/today/ExchangeCalculatorModal').then((m) => m.ExchangeCalculatorModal),
  { ssr: false }
)

const ExchangeChartModal = dynamic(
  () => import('@/components/today/ExchangeChartModal').then((m) => m.ExchangeChartModal),
  { ssr: false }
)

const RussiaNewsSection = dynamic(
  () => import('@/components/today/RussiaNewsSection').then((module) => module.RussiaNewsSection),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg p-2.5 text-sm text-muted-foreground">실시간 뉴스를 불러오는 중...</div>
    ),
  }
)

export default function TodayPage() {
  const isPageVisible = usePageVisibility(true)
  const wasPageVisibleRef = useRef<boolean>(isPageVisible)
  const { profile, loading: userLoading } = useUser()
  const [userCity, setUserCity] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  // 환율 모달 상태
  const [showCalculator, setShowCalculator] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [chartType, setChartType] = useState<ChartType>('rub')
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('week')

  const loading = userLoading


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
    if (profile?.city) {
      setUserCity(profile.city)
      void fetchWeatherData(profile.city)
    }

    void fetchExchangeRates()
  }, [profile?.city, fetchWeatherData, fetchExchangeRates])

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

  const normalizeHistoryToCurrentSpot = useCallback((data: OHLCData[], type: 'rub' | 'usd') => {
    if (!exchangeRates || data.length === 0) return data

    const targetSpot = type === 'rub'
      ? (exchangeRates.krwToRub > 0 ? 1 / exchangeRates.krwToRub : null)
      : (exchangeRates.rubToUsd > 0 ? 1 / exchangeRates.rubToUsd : null)

    if (!targetSpot || !Number.isFinite(targetSpot) || targetSpot <= 0) return data

    const lastClose = data[data.length - 1]?.close
    if (!lastClose || !Number.isFinite(lastClose) || lastClose <= 0) return data

    const factor = targetSpot / lastClose
    if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.0001) return data

    const round2 = (value: number) => Number.parseFloat(value.toFixed(2))

    return data.map((point) => ({
      ...point,
      open: round2(point.open * factor),
      high: round2(point.high * factor),
      low: round2(point.low * factor),
      close: round2(point.close * factor),
    }))
  }, [exchangeRates])

  // 환율 그래프 데이터 로드
  const loadChartData = useCallback(async (type: 'rub' | 'usd', period: 'week' | 'month' | 'quarter' | 'year') => {
    if (yearlyChartData[type].length > 0) {
      const normalized = normalizeHistoryToCurrentSpot(yearlyChartData[type], type)
      const filtered = filterDataByPeriod(normalized, period)
      setChartData(filtered)
      return
    }

    const cached = getCache<OHLCData[]>(
      CACHE_KEYS.EXCHANGE_HISTORY(type),
      24 * 60 * 60 * 1000
    )
    if (cached && cached.length > 0) {
      logger.log('환율 히스토리 캐시 히트:', type)
      const normalized = normalizeHistoryToCurrentSpot(cached, type)
      setYearlyChartData(prev => ({ ...prev, [type]: normalized }))
      const filtered = filterDataByPeriod(normalized, period)
      setChartData(filtered)
      return
    }

    setIsLoadingChart(true)
    try {
      const query = new URLSearchParams({
        currency: type,
        v: '3',
      })

      if (exchangeRates?.krwToRub && exchangeRates?.rubToUsd) {
        query.set('spot_krw_to_rub', String(exchangeRates.krwToRub))
        query.set('spot_rub_to_usd', String(exchangeRates.rubToUsd))
      }

      const response = await fetch(`/api/exchange-rates/history?${query.toString()}`)

      if (!response.ok) {
        throw new Error('환율 히스토리 데이터를 가져올 수 없습니다')
      }

      const result = await response.json()
      const yearData = result.data || []
      const normalized = normalizeHistoryToCurrentSpot(yearData, type)

      setYearlyChartData(prev => ({ ...prev, [type]: normalized }))
      setCache(CACHE_KEYS.EXCHANGE_HISTORY(type), normalized, 24 * 60 * 60 * 1000)

      const filtered = filterDataByPeriod(normalized, period)
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
  }, [yearlyChartData, filterDataByPeriod, exchangeRates, normalizeHistoryToCurrentSpot])

  // 환율 차트 열기
  const handleOpenChart = useCallback((type: ChartType) => {
    setChartType(type)
    setShowChart(true)
    void loadChartData(type, chartPeriod)
  }, [chartPeriod, loadChartData])

  const handlePeriodChange = useCallback((period: ChartPeriod) => {
    setChartPeriod(period)
    void loadChartData(chartType, period)
  }, [chartType, loadChartData])

  return (
    <div className="bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header + Weather + 환율 */}
        <WeatherSection
          loading={loading}
          userCity={userCity}
          weather={weather}
          exchangeRates={exchangeRates}
          onOpenCalculator={() => setShowCalculator(true)}
          onOpenRubChart={() => handleOpenChart('rub')}
          onOpenUsdChart={() => handleOpenChart('usd')}
        />

        {/* Content */}
        <div className="px-4 pt-0.5 pb-4 space-y-1">

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

      {/* 환율 계산기 모달 */}
      {showCalculator && exchangeRates && (
        <ExchangeCalculatorModal
          exchangeRates={exchangeRates}
          onClose={() => setShowCalculator(false)}
        />
      )}

      {/* 환율 그래프 모달 */}
      {showChart && exchangeRates && (
        <ExchangeChartModal
          chartType={chartType}
          chartPeriod={chartPeriod}
          chartData={chartData}
          isLoadingChart={isLoadingChart}
          onClose={() => setShowChart(false)}
          onPeriodChange={handlePeriodChange}
        />
      )}
    </div>
  )
}
