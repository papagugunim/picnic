import { NextResponse } from 'next/server'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Route')

interface ExchangeRatesPayload {
  krwToRub: number
  rubToUsd: number
  lastUpdated: string
  source: 'exchangerate-api' | 'naver' | 'koreaexim' | 'fallback'
  cached?: boolean
  stale?: boolean
}

let cachedData: ExchangeRatesPayload | null = null
let lastFetchTime = 0
let fetchPromise: Promise<ExchangeRatesPayload> | null = null

const CACHE_DURATION_MS = 10 * 60 * 1000
const CACHE_HEADER = 'public, s-maxage=600, stale-while-revalidate=300'

async function fetchWithTimeout(
  url: string,
  init: (RequestInit & { next?: { revalidate?: number } }) | undefined,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

function json(payload: ExchangeRatesPayload, cacheControl: string = CACHE_HEADER, fallbackHeader?: string) {
  const headers: Record<string, string> = {
    'Cache-Control': cacheControl,
  }

  if (fallbackHeader) {
    headers['X-Exchange-Rate-Fallback'] = fallbackHeader
  }

  return NextResponse.json(payload, { headers })
}

function toNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

async function fetchFromExchangeRateApi(): Promise<ExchangeRatesPayload | null> {
  try {
    const response = await fetchWithTimeout(
      'https://api.exchangerate-api.com/v4/latest/KRW',
      { next: { revalidate: 600 } },
      5000
    )

    if (!response.ok) return null

    const data = (await response.json()) as { rates?: Record<string, number> }
    const krwToRub = toNumber(data?.rates?.RUB)
    const krwToUsd = toNumber(data?.rates?.USD)

    if (!krwToRub || !krwToUsd || krwToRub <= 0) return null

    const rubToUsd = krwToUsd / krwToRub
    if (!Number.isFinite(rubToUsd) || rubToUsd <= 0) return null

    return {
      krwToRub: parseFloat(krwToRub.toFixed(6)),
      rubToUsd: parseFloat(rubToUsd.toFixed(6)),
      lastUpdated: new Date().toISOString(),
      source: 'exchangerate-api',
    }
  } catch (error) {
    logger.warn('ExchangeRate-API 실패:', error)
    return null
  }
}

async function fetchFromNaver(): Promise<ExchangeRatesPayload | null> {
  try {
    const [rubResponse, usdResponse] = await Promise.all([
      fetchWithTimeout(
        'https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_RURKRW',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
          next: { revalidate: 600 },
        },
        5000
      ),
      fetchWithTimeout(
        'https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDRUB',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
          next: { revalidate: 600 },
        },
        5000
      ),
    ])

    if (!rubResponse.ok || !usdResponse.ok) return null

    const [rubHtml, usdHtml] = await Promise.all([rubResponse.text(), usdResponse.text()])

    const extractRate = (html: string): number | null => {
      const match = html.match(/<span class="value">([0-9,.]+)<\/span>/)
      if (!match?.[1]) return null
      const value = parseFloat(match[1].replace(/,/g, ''))
      return Number.isFinite(value) && value > 0 ? value : null
    }

    const krwToRub = extractRate(rubHtml)
    const rubToUsd = extractRate(usdHtml)

    if (!krwToRub || !rubToUsd) return null

    return {
      krwToRub: parseFloat(krwToRub.toFixed(6)),
      rubToUsd: parseFloat(rubToUsd.toFixed(6)),
      lastUpdated: new Date().toISOString(),
      source: 'naver',
    }
  } catch (error) {
    logger.warn('네이버 환율 실패:', error)
    return null
  }
}

async function fetchFromKoreaExim(): Promise<ExchangeRatesPayload | null> {
  try {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const authKey = process.env.KOREAEXIM_API_KEY || ''
    const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${authKey}&searchdate=${today}&data=AP01`

    const response = await fetchWithTimeout(
      url,
      { next: { revalidate: 600 } },
      5000
    )

    if (!response.ok) return null

    const data = (await response.json()) as Array<{ cur_unit?: string; deal_bas_r?: string }>
    if (!Array.isArray(data)) return null

    const rubData = data.find((item) => item.cur_unit === 'RUB')
    const usdData = data.find((item) => item.cur_unit === 'USD')

    if (!rubData?.deal_bas_r || !usdData?.deal_bas_r) return null

    const rubKrw = parseFloat(rubData.deal_bas_r.replace(/,/g, ''))
    const usdKrw = parseFloat(usdData.deal_bas_r.replace(/,/g, ''))

    if (!Number.isFinite(rubKrw) || !Number.isFinite(usdKrw) || rubKrw <= 0 || usdKrw <= 0) {
      return null
    }

    return {
      // KRW -> RUB
      krwToRub: parseFloat((1 / rubKrw).toFixed(6)),
      // RUB -> USD
      rubToUsd: parseFloat((rubKrw / usdKrw).toFixed(6)),
      lastUpdated: new Date().toISOString(),
      source: 'koreaexim',
    }
  } catch (error) {
    logger.warn('한국수출입은행 API 실패:', error)
    return null
  }
}

async function fetchFreshExchangeRates(): Promise<ExchangeRatesPayload> {
  const providers = [fetchFromExchangeRateApi, fetchFromNaver, fetchFromKoreaExim]

  for (const provider of providers) {
    const payload = await provider()
    if (payload) return payload
  }

  throw new Error('모든 환율 소스에서 데이터를 가져오지 못했습니다.')
}

export async function GET() {
  const now = Date.now()

  if (cachedData && now - lastFetchTime < CACHE_DURATION_MS) {
    return json({
      ...cachedData,
      cached: true,
    })
  }

  if (!fetchPromise) {
    fetchPromise = (async () => {
      const fresh = await fetchFreshExchangeRates()
      cachedData = fresh
      lastFetchTime = Date.now()
      return fresh
    })().finally(() => {
      fetchPromise = null
    })
  }

  try {
    const payload = await fetchPromise
    return json(payload)
  } catch (error) {
    logger.error('환율 정보 가져오기 실패:', error)

    if (cachedData) {
      return json(
        {
          ...cachedData,
          stale: true,
        },
        'public, s-maxage=120, stale-while-revalidate=600',
        'stale-cache'
      )
    }

    return json(
      {
        krwToRub: 0.0547,
        rubToUsd: 0.0127,
        lastUpdated: new Date().toISOString(),
        source: 'fallback',
      },
      'public, s-maxage=120, stale-while-revalidate=600',
      'static-fallback'
    )
  }
}
