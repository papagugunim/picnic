import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Route')

import { NextResponse } from 'next/server'

// 캐시 저장소 (메모리)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60 * 60 * 1000 // 1시간 캐시

// OHLC 데이터 타입
interface OHLCData {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency') || 'rub' // rub, usd

    // 캐시 키는 currency만 사용 (1년치 데이터를 통째로 캐시)
    const cacheKey = `year-ohlc-${currency}`

    // 캐시 확인
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        data: cached.data,
        cached: true
      })
    }

    let historyData: OHLCData[] = []

    if (currency === 'usd') {
      // USD/RUB: Alpha Vantage에서 실제 OHLC 데이터 가져오기
      historyData = await fetchAlphaVantageOHLC('USD', 'RUB')
    } else {
      // RUB/KRW: 한국수출입은행 데이터 + 시뮬레이션 OHLC
      historyData = await fetchSimulatedRubKrwOHLC()
    }

    // 데이터가 없으면 대체 데이터 생성
    if (historyData.length === 0) {
      logger.warn('히스토리 데이터 없음, 대체 데이터 생성')
      const fallbackData = generateFallbackOHLCData(currency)

      cache.set(cacheKey, {
        data: fallbackData,
        timestamp: Date.now()
      })

      return NextResponse.json({
        data: fallbackData,
        fallback: true
      })
    }

    // 캐시에 저장
    cache.set(cacheKey, {
      data: historyData,
      timestamp: Date.now()
    })

    return NextResponse.json({
      data: historyData,
      cached: false
    })

  } catch (error) {
    logger.error('환율 히스토리 가져오기 실패:', error)

    // 에러 시 대체 데이터
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency') || 'rub'

    return NextResponse.json({
      data: generateFallbackOHLCData(currency),
      error: true
    })
  }
}

// Alpha Vantage에서 USD/RUB OHLC 데이터 가져오기
async function fetchAlphaVantageOHLC(from: string, to: string): Promise<OHLCData[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY
    if (!apiKey || apiKey === 'demo') {
      logger.warn('Alpha Vantage API 키가 설정되지 않았습니다.')
      return []
    }

    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=full&apikey=${apiKey}`
    const response = await fetch(url, { next: { revalidate: 3600 } })

    if (!response.ok) {
      throw new Error('Alpha Vantage API 호출 실패')
    }

    const data = await response.json()
    const timeSeries = data['Time Series FX (Daily)']

    if (!timeSeries) {
      logger.error('Alpha Vantage 응답에 Time Series가 없습니다:', data)
      return []
    }

    // 최근 365일 데이터만 추출
    const ohlcData: OHLCData[] = []
    const dates = Object.keys(timeSeries).slice(0, 365)

    for (const date of dates) {
      const dayData = timeSeries[date]
      ohlcData.push({
        date: formatDateForDisplay(new Date(date)),
        open: parseFloat(dayData['1. open']),
        high: parseFloat(dayData['2. high']),
        low: parseFloat(dayData['3. low']),
        close: parseFloat(dayData['4. close'])
      })
    }

    // 날짜 순서 뒤집기 (오래된 것부터)
    return ohlcData.reverse()
  } catch (error) {
    logger.error('Alpha Vantage OHLC 가져오기 실패:', error)
    return []
  }
}

// 한국수출입은행 데이터로 RUB/KRW OHLC 시뮬레이션
async function fetchSimulatedRubKrwOHLC(): Promise<OHLCData[]> {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 365)

    const datesToFetch: Date[] = []
    const currentDate = new Date(startDate)

    // 주 1-2회 샘플링 (성능 최적화)
    while (currentDate <= endDate) {
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        datesToFetch.push(new Date(currentDate))
      }
      currentDate.setDate(currentDate.getDate() + 3) // 3일마다
    }

    const ohlcData: OHLCData[] = []
    const batchSize = 10

    for (let i = 0; i < datesToFetch.length; i += batchSize) {
      const batch = datesToFetch.slice(i, i + batchSize)

      const batchResults = await Promise.all(
        batch.map(async (date) => {
          const dateStr = formatDate(date)

          try {
            const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=&searchdate=${dateStr}&data=AP01`
            const response = await fetch(url, { next: { revalidate: 3600 } })

            if (response.ok) {
              const data = await response.json()
              const rubData = data.find((item: any) => item.cur_unit === 'RUB')

              if (rubData) {
                const rubRate = parseFloat(rubData.deal_bas_r.replace(/,/g, ''))
                const close = parseFloat((1 / rubRate).toFixed(2))

                // OHLC 시뮬레이션: close 기준 ±2% 변동
                const variation = close * 0.02
                const open = parseFloat((close + (Math.random() - 0.5) * variation).toFixed(2))
                const high = parseFloat(Math.max(open, close, close + Math.random() * variation).toFixed(2))
                const low = parseFloat(Math.min(open, close, close - Math.random() * variation).toFixed(2))

                return {
                  date: formatDateForDisplay(date),
                  open,
                  high,
                  low,
                  close
                }
              }
            }
          } catch (error) {
            logger.error(`날짜 ${dateStr} 데이터 가져오기 실패:`, error)
          }
          return null
        })
      )

      ohlcData.push(...batchResults.filter(item => item !== null) as OHLCData[])
    }

    return ohlcData
  } catch (error) {
    logger.error('RUB/KRW OHLC 시뮬레이션 실패:', error)
    return []
  }
}

// 날짜 포맷팅 (YYYYMMDD)
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

// 날짜 표시용 포맷팅
function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

// 대체 OHLC 데이터 생성 (API 실패 시)
function generateFallbackOHLCData(currency: string): OHLCData[] {
  const dataPoints = 365
  const baseRate = currency === 'rub' ? 18 : 90
  const data: OHLCData[] = []

  for (let i = dataPoints - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)

    // 일별 변동 생성
    const dailyVariation = (Math.random() - 0.5) * (baseRate * 0.05)
    const close = parseFloat((baseRate + dailyVariation).toFixed(2))

    const variation = baseRate * 0.02
    const open = parseFloat((close + (Math.random() - 0.5) * variation).toFixed(2))
    const high = parseFloat(Math.max(open, close, close + Math.random() * variation).toFixed(2))
    const low = parseFloat(Math.min(open, close, close - Math.random() * variation).toFixed(2))

    data.push({
      date: formatDateForDisplay(date),
      open,
      high,
      low,
      close
    })
  }

  return data
}
