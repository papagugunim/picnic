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

interface SpotRateHints {
  rubKrw: number | null // 1 RUB -> KRW
  usdRub: number | null // 1 USD -> RUB
}

interface LiveExchangeRatesSnapshot {
  krwToRub: number // 1 KRW -> RUB
  rubToUsd: number // 1 RUB -> USD
}

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

function toPositiveNumber(input: string | null): number | null {
  if (!input) return null
  const numeric = Number.parseFloat(input)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return numeric
}

function extractSpotRateHints(searchParams: URLSearchParams): SpotRateHints {
  const spotKrwToRub = toPositiveNumber(searchParams.get('spot_krw_to_rub'))
  const spotRubToUsd = toPositiveNumber(searchParams.get('spot_rub_to_usd'))

  return {
    rubKrw: spotKrwToRub ? (1 / spotKrwToRub) : null,
    usdRub: spotRubToUsd ? (1 / spotRubToUsd) : null,
  }
}

function defaultBaseRate(currency: Currency): number {
  return currency === 'rub' ? 18.2 : 90
}

function formatDateForDisplay(date: Date): string {
  return dateFormatter.format(date)
}

function round2(value: number): number {
  return parseFloat(value.toFixed(2))
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

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function toSnapshotNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return value
}

async function fetchLiveRatesFromExchangeRateApi(): Promise<LiveExchangeRatesSnapshot | null> {
  try {
    const response = await fetchWithTimeout('https://api.exchangerate-api.com/v4/latest/KRW', 4000)
    if (!response.ok) return null

    const data = (await response.json()) as { rates?: Record<string, number> }
    const krwToRub = toSnapshotNumber(data?.rates?.RUB)
    const krwToUsd = toSnapshotNumber(data?.rates?.USD)

    if (!krwToRub || !krwToUsd) return null

    const rubToUsd = krwToUsd / krwToRub
    if (!Number.isFinite(rubToUsd) || rubToUsd <= 0) return null

    return {
      krwToRub,
      rubToUsd,
    }
  } catch (error) {
    logger.warn('실시간 환율(ExchangeRate-API) 조회 실패:', error)
    return null
  }
}

async function fetchLiveRatesFromNaver(): Promise<LiveExchangeRatesSnapshot | null> {
  try {
    const [rubResponse, usdResponse] = await Promise.all([
      fetchWithTimeout(
        'https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_RURKRW',
        4000,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      ),
      fetchWithTimeout(
        'https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDRUB',
        4000,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      ),
    ])

    if (!rubResponse.ok || !usdResponse.ok) return null

    const [rubHtml, usdHtml] = await Promise.all([rubResponse.text(), usdResponse.text()])
    const extractRate = (html: string): number | null => {
      const match = html.match(/<span class="value">([0-9,.]+)<\/span>/)
      if (!match?.[1]) return null
      const value = Number.parseFloat(match[1].replace(/,/g, ''))
      return Number.isFinite(value) && value > 0 ? value : null
    }

    const rubKrw = extractRate(rubHtml) // 1 RUB -> KRW
    const usdRub = extractRate(usdHtml) // 1 USD -> RUB
    if (!rubKrw || !usdRub) return null

    return {
      krwToRub: 1 / rubKrw,
      rubToUsd: 1 / usdRub,
    }
  } catch (error) {
    logger.warn('실시간 환율(네이버) 조회 실패:', error)
    return null
  }
}

async function fetchLiveRatesFromKoreaExim(): Promise<LiveExchangeRatesSnapshot | null> {
  try {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const authKey = process.env.KOREAEXIM_API_KEY || ''
    const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${authKey}&searchdate=${today}&data=AP01`

    const response = await fetchWithTimeout(url, 4000)
    if (!response.ok) return null

    const data = (await response.json()) as Array<{ cur_unit?: string; deal_bas_r?: string }>
    if (!Array.isArray(data)) return null

    const rubRow = data.find((item) => item.cur_unit === 'RUB')
    const usdRow = data.find((item) => item.cur_unit === 'USD')
    if (!rubRow?.deal_bas_r || !usdRow?.deal_bas_r) return null

    const rubKrw = parseFloat(rubRow.deal_bas_r.replace(/,/g, ''))
    const usdKrw = parseFloat(usdRow.deal_bas_r.replace(/,/g, ''))
    if (!Number.isFinite(rubKrw) || !Number.isFinite(usdKrw) || rubKrw <= 0 || usdKrw <= 0) return null

    return {
      krwToRub: 1 / rubKrw,
      rubToUsd: rubKrw / usdKrw,
    }
  } catch (error) {
    logger.warn('실시간 환율(한국수출입은행) 조회 실패:', error)
    return null
  }
}

async function fetchLiveExchangeRates(): Promise<LiveExchangeRatesSnapshot | null> {
  const providers = [fetchLiveRatesFromExchangeRateApi, fetchLiveRatesFromNaver, fetchLiveRatesFromKoreaExim]
  for (const provider of providers) {
    const snapshot = await provider()
    if (snapshot) return snapshot
  }
  return null
}

async function resolveSpotRates(hints: SpotRateHints): Promise<SpotRateHints> {
  if (hints.rubKrw && hints.usdRub) return hints

  const live = await fetchLiveExchangeRates()
  if (!live) return hints

  return {
    rubKrw: hints.rubKrw || (live.krwToRub > 0 ? 1 / live.krwToRub : null),
    usdRub: hints.usdRub || (live.rubToUsd > 0 ? 1 / live.rubToUsd : null),
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

function normalizeHistoryToSpot(history: OHLCData[], spotRate: number | null): OHLCData[] {
  if (!history.length || !spotRate || !Number.isFinite(spotRate) || spotRate <= 0) {
    return history
  }

  const lastClose = history[history.length - 1]?.close
  if (!lastClose || !Number.isFinite(lastClose) || lastClose <= 0) {
    return history
  }

  const factor = spotRate / lastClose
  if (!Number.isFinite(factor) || factor <= 0) {
    return history
  }

  if (Math.abs(factor - 1) < 0.0001) {
    return history
  }

  return history.map((point) => ({
    ...point,
    open: round2(point.open * factor),
    high: round2(point.high * factor),
    low: round2(point.low * factor),
    close: round2(point.close * factor),
  }))
}

async function buildHistoryData(currency: Currency, spotRates: SpotRateHints): Promise<OHLCData[]> {
  if (currency === 'usd') {
    const spotUsdRub = spotRates.usdRub
    const apiData = await fetchAlphaVantageOHLC('USD', 'RUB')
    if (apiData.length > 0) {
      return normalizeHistoryToSpot(apiData, spotUsdRub)
    }
    const synthetic = generateDeterministicOHLCData('usd', spotUsdRub ?? defaultBaseRate('usd'))
    return normalizeHistoryToSpot(synthetic, spotUsdRub)
  }

  const spotRubKrw = spotRates.rubKrw
  const synthetic = generateDeterministicOHLCData('rub', spotRubKrw ?? defaultBaseRate('rub'))
  return normalizeHistoryToSpot(synthetic, spotRubKrw)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const currency = toCurrency(searchParams.get('currency'))
  const spotHints = extractSpotRateHints(searchParams)
  const spotKey = currency === 'rub'
    ? (spotHints.rubKrw ? spotHints.rubKrw.toFixed(4) : 'auto')
    : (spotHints.usdRub ? spotHints.usdRub.toFixed(4) : 'auto')
  const cacheKey = `year-ohlc-${currency}-${spotKey}`

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return withCacheHeaders({
      data: cached.data,
      cached: true,
    })
  }

  let pending = inFlight.get(cacheKey)
  if (!pending) {
    pending = resolveSpotRates(spotHints)
      .then((resolvedSpots) => buildHistoryData(currency, resolvedSpots))
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
