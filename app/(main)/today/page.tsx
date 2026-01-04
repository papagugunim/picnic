'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Newspaper, Calendar as CalendarIcon, MapPin, Calculator, X, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { getCache, setCache, clearCache, CACHE_KEYS } from '@/lib/cache'

// 차트 컴포넌트 동적 임포트 (번들 크기 최적화)
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })

// 도시별 타임존 매핑
const CITY_TIMEZONES: Record<string, string> = {
  'Moscow': 'Europe/Moscow',
  'Saint Petersburg': 'Europe/Moscow',
  'moscow': 'Europe/Moscow',
  'spb': 'Europe/Moscow'
}

// 도시 이름 한글 변환
const CITY_NAMES_KR: Record<string, string> = {
  'Moscow': '모스크바',
  'Saint Petersburg': '상트페테르부르크',
  'moscow': '모스크바',
  'spb': '상트페테르부르크'
}

// 날씨 타입 정의
type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow'

interface WeatherData {
  condition: WeatherCondition
  temp: number
  feelsLike: number
  icon: string
}

// 날씨 상태별 이모지
const WEATHER_ICONS: Record<WeatherCondition, string> = {
  clear: '☀️',
  cloudy: '☁️',
  rain: '🌧️',
  snow: '❄️'
}

// 날씨 상태 한글
const WEATHER_NAMES: Record<WeatherCondition, string> = {
  clear: '맑음',
  cloudy: '흐림',
  rain: '비',
  snow: '눈'
}

interface ExchangeRates {
  krwToRub: number
  rubToUsd: number
  lastUpdated: string
  source?: string
}

export default function TodayPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showAllNews, setShowAllNews] = useState(false)
  const [userCity, setUserCity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  const [weatherLastUpdated, setWeatherLastUpdated] = useState<Date | null>(null)
  const [isRefreshingWeather, setIsRefreshingWeather] = useState(false)
  const [exchangeRatesLastUpdated, setExchangeRatesLastUpdated] = useState<Date | null>(null)
  const [isRefreshingExchangeRates, setIsRefreshingExchangeRates] = useState(false)

  // 환율 계산기 상태
  const [rubAmount, setRubAmount] = useState<string>('')
  const [krwAmount, setKrwAmount] = useState<string>('')
  const [lastEdited, setLastEdited] = useState<'rub' | 'krw'>('rub')
  const [showCalculator, setShowCalculator] = useState(false)

  // 환율 그래프 모달 상태
  const [showChart, setShowChart] = useState(false)
  const [chartType, setChartType] = useState<'rub' | 'usd'>('rub')
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('week')
  const [chartData, setChartData] = useState<{ date: string; rate: number }[]>([])
  const [isLoadingChart, setIsLoadingChart] = useState(false)
  // 1년치 전체 데이터 캐시 (성능 개선)
  const [yearlyChartData, setYearlyChartData] = useState<{
    rub: { date: string; rate: number }[]
    usd: { date: string; rate: number }[]
  }>({ rub: [], usd: [] })

  // 환율 데이터 가져오기 함수
  const fetchExchangeRates = useCallback(async (forceRefresh: boolean = false) => {
    try {
      // 강제 새로고침이 아닐 때만 캐시 확인
      if (!forceRefresh) {
        // 캐시 TTL: 15분 (더 자주 업데이트)
        const cached = getCache<ExchangeRates>(CACHE_KEYS.EXCHANGE_RATES, 15 * 60 * 1000)
        if (cached) {
          logger.log('환율 데이터 캐시 히트')
          setExchangeRates(cached)
          setExchangeRatesLastUpdated(new Date(cached.lastUpdated))
          return
        }
      } else {
        // 강제 새로고침 시 캐시 삭제
        clearCache(CACHE_KEYS.EXCHANGE_RATES)
        logger.log('환율 데이터 강제 새로고침')
      }

      // 자체 API 라우트를 통해 네이버 환율 정보 가져오기
      const response = await fetch('/api/exchange-rates')

      if (!response.ok) {
        throw new Error('환율 정보를 가져올 수 없습니다')
      }

      const data = await response.json()

      const rates = {
        krwToRub: data.krwToRub,
        rubToUsd: data.rubToUsd,
        lastUpdated: new Date(data.lastUpdated).toLocaleString('ko-KR'),
        source: data.source
      }

      // 캐시에 저장 (15분 TTL)
      setCache(CACHE_KEYS.EXCHANGE_RATES, rates, 15 * 60 * 1000)

      setExchangeRates(rates)
      setExchangeRatesLastUpdated(new Date())

      logger.log('환율 출처:', data.source === 'naver' ? '네이버 금융' : data.source === 'api' ? 'ExchangeRate API' : '대체 API')
    } catch (error) {
      logger.error('환율 정보 가져오기 실패:', error)
      // 에러 발생 시 예시 데이터
      setExchangeRates({
        krwToRub: 0.075,
        rubToUsd: 0.011,
        lastUpdated: new Date().toLocaleString('ko-KR')
      })
      setExchangeRatesLastUpdated(new Date())
    }
  }, [])

  // 날씨 데이터 가져오기 함수
  const fetchWeatherData = useCallback(async (city: string, forceRefresh: boolean = false) => {
      try {
        // 강제 새로고침이 아닐 때만 캐시 확인
        if (!forceRefresh) {
          // 캐시 TTL: 10분 (더 자주 업데이트)
          const cached = getCache<WeatherData>(CACHE_KEYS.WEATHER(city), 10 * 60 * 1000)
          if (cached) {
            logger.log('날씨 데이터 캐시 히트:', city)
            setWeather(cached)
            return
          }
        } else {
          // 강제 새로고침 시 캐시 삭제
          clearCache(CACHE_KEYS.WEATHER(city))
          logger.log('날씨 데이터 강제 새로고침:', city)
        }

        // 도시별 좌표 (Moscow, Saint Petersburg)
        const cityCoords: Record<string, { lat: number; lon: number }> = {
          'Moscow': { lat: 55.7558, lon: 37.6173 },
          'Saint Petersburg': { lat: 59.9311, lon: 30.3609 },
          'moscow': { lat: 55.7558, lon: 37.6173 },
          'spb': { lat: 59.9311, lon: 30.3609 }
        }

        const coords = cityCoords[city]
        if (!coords) return

        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
        if (!apiKey || apiKey === 'your-api-key-here') {
          logger.warn('OpenWeatherMap API 키가 설정되지 않았습니다. 예시 데이터를 사용합니다.')
          // API 키가 없을 때 예시 데이터 사용
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

          setWeather({
            condition,
            temp,
            feelsLike,
            icon: WEATHER_ICONS[condition]
          })
          setWeatherLastUpdated(new Date())
          return
        }

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric&lang=kr`
        )

        if (!response.ok) {
          throw new Error('날씨 정보를 가져올 수 없습니다')
        }

        const data = await response.json()

        // OpenWeatherMap 날씨 코드를 우리 조건으로 매핑
        let condition: WeatherCondition = 'clear'
        const weatherId = data.weather[0].id

        if (weatherId >= 200 && weatherId < 600) {
          // 천둥, 이슬비, 비
          condition = 'rain'
        } else if (weatherId >= 600 && weatherId < 700) {
          // 눈
          condition = 'snow'
        } else if (weatherId >= 800 && weatherId < 900) {
          // 맑음 또는 구름
          condition = weatherId === 800 ? 'clear' : 'cloudy'
        }

        const weatherData: WeatherData = {
          condition,
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          icon: WEATHER_ICONS[condition]
        }

        // 캐시에 저장 (10분 TTL)
        setCache(CACHE_KEYS.WEATHER(city), weatherData, 10 * 60 * 1000)

        setWeather(weatherData)
        setWeatherLastUpdated(new Date())
      } catch (error) {
        logger.error('날씨 정보 가져오기 실패:', error)
        // 에러 발생 시 기본 날씨 표시
        setWeather({
          condition: 'cloudy',
          temp: 0,
          feelsLike: -2,
          icon: WEATHER_ICONS['cloudy']
        })
        setWeatherLastUpdated(new Date())
      }
    }, [])

  useEffect(() => {
    const fetchUserCity = async () => {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      logger.log('User:', user)
      logger.log('User Error:', userError)

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('city')
          .eq('id', user.id)
          .single()

        logger.log('Profile:', profile)
        logger.log('Profile Error:', profileError)

        if (profile?.city) {
          setUserCity(profile.city)
          fetchWeatherData(profile.city)
        }
      }
      setLoading(false)
    }

    setCurrentDate(new Date())
    fetchUserCity()
    fetchExchangeRates()

    // 10분마다 날씨 자동 업데이트 (캐시 TTL과 동일)
    const weatherInterval = setInterval(() => {
      if (userCity) {
        logger.log('자동 날씨 업데이트 실행')
        fetchWeatherData(userCity, true) // forceRefresh=true로 최신 데이터 가져오기
        setWeatherLastUpdated(new Date())
      }
    }, 10 * 60 * 1000) // 10분

    // 15분마다 환율 자동 업데이트 (캐시 TTL과 동일)
    const exchangeRatesInterval = setInterval(() => {
      logger.log('자동 환율 업데이트 실행')
      fetchExchangeRates(true) // forceRefresh=true로 최신 데이터 가져오기
    }, 15 * 60 * 1000) // 15분

    return () => {
      clearInterval(weatherInterval)
      clearInterval(exchangeRatesInterval)
    }
  }, [userCity, fetchWeatherData, fetchExchangeRates])

  const formatDate = () => {
    const timezone = userCity ? CITY_TIMEZONES[userCity] : undefined

    return currentDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      timeZone: timezone
    })
  }

  const getCityName = () => {
    if (!userCity) return '위치 설정 필요'
    return CITY_NAMES_KR[userCity] || userCity
  }

  // 수동 날씨 새로고침
  const handleRefreshWeather = async () => {
    if (!userCity || isRefreshingWeather) return

    setIsRefreshingWeather(true)
    try {
      await fetchWeatherData(userCity, true) // forceRefresh=true
      setWeatherLastUpdated(new Date())
    } finally {
      setIsRefreshingWeather(false)
    }
  }

  // 수동 환율 새로고침
  const handleRefreshExchangeRates = async () => {
    if (isRefreshingExchangeRates) return

    setIsRefreshingExchangeRates(true)
    try {
      await fetchExchangeRates(true) // forceRefresh=true
    } finally {
      setIsRefreshingExchangeRates(false)
    }
  }

  // 마지막 업데이트 시간 포맷팅
  const getLastUpdatedText = (lastUpdated: Date | null) => {
    if (!lastUpdated) return ''

    const now = new Date()
    const diffMs = now.getTime() - lastUpdated.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}시간 전`

    return lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  // 숫자 포맷팅 함수 (천 단위 쉼표)
  const formatNumber = (value: string): string => {
    const num = value.replace(/,/g, '')
    if (!num || isNaN(Number(num))) return value
    return Number(num).toLocaleString('ko-KR')
  }

  // 기간별 데이터 필터링
  const filterDataByPeriod = useCallback((data: { date: string; rate: number }[], period: 'week' | 'month' | 'quarter' | 'year') => {
    if (period === 'year') return data

    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
    return data.slice(-days)
  }, [])

  // 환율 그래프 데이터 로드 (성능 개선: 1년치 데이터를 한 번만 로드)
  const loadChartData = useCallback(async (type: 'rub' | 'usd', period: 'week' | 'month' | 'quarter' | 'year') => {
    // 이미 1년치 데이터가 있으면 필터링만 수행 (빠름!)
    if (yearlyChartData[type].length > 0) {
      const filtered = filterDataByPeriod(yearlyChartData[type], period)
      setChartData(filtered)
      return
    }

    // 캐시 확인 (24시간 TTL)
    const cached = getCache<{ date: string; rate: number }[]>(
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

    // 1년치 데이터가 없으면 API 호출
    setIsLoadingChart(true)
    try {
      const response = await fetch(`/api/exchange-rates/history?currency=${type}`)

      if (!response.ok) {
        throw new Error('환율 히스토리 데이터를 가져올 수 없습니다')
      }

      const result = await response.json()
      const yearData = result.data || []

      // 1년치 데이터를 메모리 캐시에 저장
      setYearlyChartData(prev => ({
        ...prev,
        [type]: yearData
      }))

      // localStorage 캐시에도 저장 (24시간 TTL)
      setCache(CACHE_KEYS.EXCHANGE_HISTORY(type), yearData, 24 * 60 * 60 * 1000)

      // 기간에 맞게 필터링하여 표시
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

  // 환율 계산 함수
  const handleRubChange = (value: string) => {
    // 쉼표 제거하고 숫자만 추출
    const numericValue = value.replace(/,/g, '')
    setRubAmount(numericValue)
    setLastEdited('rub')

    if (numericValue && exchangeRates) {
      const rub = parseFloat(numericValue)
      if (!isNaN(rub)) {
        const krw = rub / exchangeRates.krwToRub
        setKrwAmount(krw.toFixed(0))
      } else {
        setKrwAmount('')
      }
    } else {
      setKrwAmount('')
    }
  }

  const handleKrwChange = (value: string) => {
    // 쉼표 제거하고 숫자만 추출
    const numericValue = value.replace(/,/g, '')
    setKrwAmount(numericValue)
    setLastEdited('krw')

    if (numericValue && exchangeRates) {
      const krw = parseFloat(numericValue)
      if (!isNaN(krw)) {
        const rub = krw * exchangeRates.krwToRub
        setRubAmount(rub.toFixed(2))
      } else {
        setRubAmount('')
      }
    } else {
      setRubAmount('')
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="px-4 py-4">
            {loading ? (
              <>
                <h1 className="text-2xl font-bold mb-2">오늘의 피크닉</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon className="w-4 h-4 animate-pulse" />
                  <span>로딩 중...</span>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">오늘의 피크닉</h1>
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
                        onClick={handleRefreshWeather}
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
                {weatherLastUpdated && (
                  <div className="flex justify-end">
                    <span className="text-xs text-muted-foreground">
                      마지막 업데이트: {getLastUpdatedText(weatherLastUpdated)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* 환율 정보 */}
          <div className="glass-strong rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h2 className="font-bold">환율</h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRefreshExchangeRates}
                  disabled={isRefreshingExchangeRates}
                  className="p-2 hover:bg-background rounded-lg transition-colors disabled:opacity-50"
                  aria-label="환율 새로고침"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-muted-foreground ${
                      isRefreshingExchangeRates ? 'animate-spin' : ''
                    }`}
                  />
                </button>
                <button
                  onClick={() => setShowCalculator(true)}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                  aria-label="환율 계산기"
                >
                  <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </button>
              </div>
            </div>

            {exchangeRates ? (
              <>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setChartType('rub')
                      setShowChart(true)
                      loadChartData('rub', chartPeriod)
                    }}
                    className="w-full flex items-center justify-between p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-lg">₽</div>
                      <div className="text-sm font-medium">1 루블</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{(1 / exchangeRates.krwToRub).toFixed(2)}원</div>
                      <div className="text-xs text-muted-foreground">1,000원 = {(exchangeRates.krwToRub * 1000).toFixed(2)}₽</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setChartType('usd')
                      setShowChart(true)
                      loadChartData('usd', chartPeriod)
                    }}
                    className="w-full flex items-center justify-between p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-lg">$</div>
                      <div className="text-sm font-medium">1 달러</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{(1 / exchangeRates.rubToUsd).toFixed(2)}₽</div>
                      <div className="text-xs text-muted-foreground">1₽ = ${exchangeRates.rubToUsd}</div>
                    </div>
                  </button>
                </div>

                <div className="mt-3 text-xs text-muted-foreground text-center space-y-0.5">
                  <div>출처: {
                    exchangeRates.source === 'koreaexim' ? '한국수출입은행' :
                    exchangeRates.source === 'naver' ? '네이버 환율' :
                    exchangeRates.source === 'api' ? 'ExchangeRate API' :
                    '캐시 데이터'
                  }</div>
                  {exchangeRatesLastUpdated && (
                    <div>마지막 업데이트: {getLastUpdatedText(exchangeRatesLastUpdated)}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center p-4">
                <div className="text-sm text-muted-foreground">환율 정보를 불러오는 중...</div>
              </div>
            )}
          </div>

          {/* 환율 계산기 모달 */}
          {showCalculator && exchangeRates && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCalculator(false)}
            >
              <div
                className="glass-strong rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-lg font-bold">환율 계산기</h2>
                  </div>
                  <button
                    onClick={() => setShowCalculator(false)}
                    className="p-2 hover:bg-background rounded-lg transition-colors"
                    aria-label="닫기"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">루블 (₽)</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatNumber(rubAmount)}
                        onChange={(e) => handleRubChange(e.target.value)}
                        placeholder="0"
                        className="w-full p-3 pr-8 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center pt-6">
                    <div className="text-muted-foreground text-lg">⇄</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">원화 (₩)</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatNumber(krwAmount)}
                        onChange={(e) => handleKrwChange(e.target.value)}
                        placeholder="0"
                        className="w-full p-3 pr-8 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₩</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground text-center">
                  현재 환율: 1₽ = {(1 / exchangeRates.krwToRub).toFixed(2)}원
                </div>
              </div>
            </div>
          )}

          {/* 환율 그래프 모달 */}
          {showChart && exchangeRates && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowChart(false)}
            >
              <div
                className="glass-strong rounded-xl p-6 max-w-2xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h2 className="text-lg font-bold">
                      {chartType === 'rub' ? '루블 환율 추이' : '달러(대 루블) 환율 추이'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowChart(false)}
                    className="p-2 hover:bg-background rounded-lg transition-colors"
                    aria-label="닫기"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* 기간 선택 */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => {
                      setChartPeriod('week')
                      loadChartData(chartType, 'week')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartPeriod === 'week'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    1주일
                  </button>
                  <button
                    onClick={() => {
                      setChartPeriod('month')
                      loadChartData(chartType, 'month')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartPeriod === 'month'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    1개월
                  </button>
                  <button
                    onClick={() => {
                      setChartPeriod('quarter')
                      loadChartData(chartType, 'quarter')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartPeriod === 'quarter'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    1분기
                  </button>
                  <button
                    onClick={() => {
                      setChartPeriod('year')
                      loadChartData(chartType, 'year')
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartPeriod === 'year'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    1년
                  </button>
                </div>

                {/* 그래프 */}
                <div className="h-64 mb-4">
                  {isLoadingChart ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        환율 데이터 로딩 중...
                      </div>
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          stroke="#888"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          stroke="#888"
                          domain={['dataMin - 1', 'dataMax + 1']}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            border: '1px solid #333',
                            borderRadius: '8px'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="rate"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-sm text-muted-foreground">
                        데이터를 불러올 수 없습니다
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  {chartType === 'rub' ? '1루블당 원화 환율' : '1달러당 루블 환율'}
                  <br />
                  <span className="text-xs opacity-70">출처: 한국수출입은행 환율 데이터</span>
                </div>
              </div>
            </div>
          )}

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
                href="https://overseas.mofa.go.kr/ru-ko/brd/m_7329/index.do?27778"
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
