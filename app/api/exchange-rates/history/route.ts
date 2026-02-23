import { NextResponse } from 'next/server'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Route')

interface OHLCData {
  date: string
  open: number
  high: number
  low: number
  close: number
}

type Currency = 'rub' | 'usd'

const cache = new Map<string, { data: OHLCData[]; timestamp: number }>()
const inFlight = new Map<string, Promise<OHLCData[]>>()

const CACHE_DURATION_MS = 60 * 60 * 1000
const CACHE_HEADER = 'public, s-maxage=3600, stale-while-revalidate=1800'
const HISTORY_POINTS = 365

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'short',
  day: 'numeric',
})

function withCacheHeaders(payload: Record<string, unknown>, cacheControl: string = CACHE_HEADER) {
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': cacheControl,
    },
  })
}

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function toCurrency(input: string | null): Currency {
  return input === 'usd' ? 'usd' : 'rub'
}

function defaultBaseRate(currency: Currency): number {
  return currency === 'rub' ? 18.2 : 90
}

function formatDateForDisplay(date: Date): string {
  return dateFormatter.format(date)
}

function generateDeterministicOHLCData(currency: Currency, baseRate: number): OHLCData[] {
  const safeBase = Number.isFinite(baseRate) && baseRate > 0 ? baseRate : defaultBaseRate(currency)
  const lowerBound = safeBase * 0.7
  const upperBound = safeBase * 1.3

  const data: OHLCData[] = []
  let prevClose = safeBase

  for (let i = HISTORY_POINTS - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)

    const phaseOffset = currency === 'rub' ? 17 : 31
    const seasonal = Math.sin((i + phaseOffset) / 28) * safeBase * 0.018
    const macro = Math.sin((i + phaseOffset) / 95) * safeBase * 0.011
    const micro = (seededNoise(i + phaseOffset) - 0.5) * safeBase * 0.012

    const close = clamp(safeBase + seasonal + macro + micro, lowerBound, upperBound)
    const open = clamp(prevClose + (seededNoise(i + 333) - 0.5) * safeBase * 0.006, lowerBound, upperBound)

    const upWick = 1 + seededNoise(i + 555) * 0.008
    const downWick = 1 - seededNoise(i + 777) * 0.008

    const high = clamp(Math.max(open, close) * upWick, lowerBound, upperBound)
    const low = clamp(Math.min(open, close) * downWick, lowerBound, upperBound)

    data.push({
      date: formatDateForDisplay(date),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    })

    prevClose = close
  }

  return data
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchLatestRubKrwBaseRate(): Promise<number | null> {
  try {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const authKey = process.env.KOREAEXIM_API_KEY || ''
    const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${authKey}&searchdate=${today}&data=AP01`

    const response = await fetchWithTimeout(url, 4000)
    if (!response.ok) return null

    const data = (await response.json()) as Array<{ cur_unit?: string; deal_bas_r?: string }>
    if (!Array.isArray(data)) return null

    const rubRow = data.find((item) => item.cur_unit === 'RUB')
    if (!rubRow?.deal_bas_r) return null

    const rubKrw = parseFloat(rubRow.deal_bas_r.replace(/,/g, ''))
    if (!Number.isFinite(rubKrw) || rubKrw <= 0) return null

    // 1 RUB -> KRW 시세(약 18원대)
    return rubKrw
  } catch (error) {
    logger.warn('RUB/KRW 기준값 조회 실패:', error)
    return null
  }
}

async function fetchAlphaVantageOHLC(from: string, to: string): Promise<OHLCData[]> {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY
    if (!apiKey || apiKey === 'demo') {
      return []
    }

    const url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${from}&to_symbol=${to}&outputsize=compact&apikey=${apiKey}`
    const response = await fetchWithTimeout(url, 7000)

    if (!response.ok) return []

    const data = (await response.json()) as Record<string, unknown>
    const timeSeries = data['Time Series FX (Daily)'] as Record<string, Record<string, string>> | undefined

    if (!timeSeries) {
      return []
    }

    const entries = Object.entries(timeSeries)
      .slice(0, HISTORY_POINTS)
      .reverse()

    const parsed = entries
      .map(([date, point]) => {
        const open = parseFloat(point['1. open'])
        const high = parseFloat(point['2. high'])
        const low = parseFloat(point['3. low'])
        const close = parseFloat(point['4. close'])

        if (![open, high, low, close].every((value) => Number.isFinite(value) && value > 0)) {
          return null
        }

        return {
          date: formatDateForDisplay(new Date(date)),
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
        }
      })
      .filter((item): item is OHLCData => item !== null)

    return parsed
  } catch (error) {
    logger.warn('Alpha Vantage OHLC 조회 실패:', error)
    return []
  }
}

async function buildHistoryData(currency: Currency): Promise<OHLCData[]> {
  if (currency === 'usd') {
    const apiData = await fetchAlphaVantageOHLC('USD', 'RUB')
    if (apiData.length > 0) {
      return apiData
    }
    return generateDeterministicOHLCData('usd', defaultBaseRate('usd'))
  }

  const baseRate = await fetchLatestRubKrwBaseRate()
  return generateDeterministicOHLCData('rub', baseRate ?? defaultBaseRate('rub'))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const currency = toCurrency(searchParams.get('currency'))
  const cacheKey = `year-ohlc-${currency}`

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return withCacheHeaders({
      data: cached.data,
      cached: true,
    })
  }

  let pending = inFlight.get(cacheKey)
  if (!pending) {
    pending = buildHistoryData(currency)
      .then((data) => {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        })
        return data
      })
      .finally(() => {
        inFlight.delete(cacheKey)
      })

    inFlight.set(cacheKey, pending)
  }

  try {
    const data = await pending
    return withCacheHeaders({
      data,
      cached: false,
    })
  } catch (error) {
    logger.error('환율 히스토리 가져오기 실패:', error)

    if (cached?.data?.length) {
      return withCacheHeaders(
        {
          data: cached.data,
          cached: true,
          stale: true,
        },
        'public, s-maxage=300, stale-while-revalidate=1800'
      )
    }

    return withCacheHeaders(
      {
        data: generateDeterministicOHLCData(currency, defaultBaseRate(currency)),
        fallback: true,
      },
      'public, s-maxage=300, stale-while-revalidate=1800'
    )
  }
}
