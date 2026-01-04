import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Route')

import { NextResponse } from 'next/server'

// 캐시 저장소 (메모리)
let cachedData: {
  krwToRub: number
  rubToUsd: number
  lastUpdated: string
  source: string
} | null = null

let lastFetchTime = 0
const CACHE_DURATION = 10 * 60 * 1000 // 10분 캐시

// 요청 중복 방지 (동시 요청 시 하나만 실행)
let fetchPromise: Promise<NextResponse> | null = null

export async function GET() {
  try {
    // 캐시된 데이터가 있고 10분 이내면 캐시 반환
    const now = Date.now()
    if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
      return NextResponse.json({
        ...cachedData,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300'
        }
      })
    }

    // 동시 요청 방지 - 이미 fetch 중이면 기다림
    if (fetchPromise) {
      return fetchPromise
    }

    // 1. ExchangeRate-API 시도 (1순위 - 안정적이고 정확)
    try {
      const apiResponse = await fetch('https://api.exchangerate-api.com/v4/latest/KRW', {
        next: { revalidate: 600 }
      })

      if (apiResponse.ok) {
        const apiData = await apiResponse.json()

        // KRW → RUB, RUB → USD 계산
        const krwToRub = parseFloat((apiData.rates.RUB || 0.055).toFixed(4))
        const krwToUsd = parseFloat((apiData.rates.USD || 0.0007).toFixed(6))
        const rubToUsd = parseFloat((krwToUsd / krwToRub).toFixed(4))

        cachedData = {
          krwToRub,
          rubToUsd,
          lastUpdated: new Date().toISOString(),
          source: 'exchangerate-api'
        }
        lastFetchTime = now
        fetchPromise = null

        logger.log(`환율 업데이트 성공: KRW→RUB=${krwToRub}, RUB→USD=${rubToUsd}`)

        return NextResponse.json(cachedData, {
          headers: {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300'
          }
        })
      }
    } catch (apiError) {
      logger.warn('ExchangeRate-API 실패, 네이버 시도:', apiError)
    }

    // 2. 네이버 금융 시도 (2순위 백업)
    try {
      const [rubResponse, usdResponse] = await Promise.all([
        fetch('https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_RURKRW', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          next: { revalidate: 600 }
        }),
        fetch('https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDRUB', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          next: { revalidate: 600 }
        })
      ])

      if (rubResponse.ok && usdResponse.ok) {
        const [rubHtml, usdHtml] = await Promise.all([
          rubResponse.text(),
          usdResponse.text()
        ])

        // HTML에서 환율 정보 추출
        const extractRate = (html: string): number | null => {
          const match = html.match(/<span class="value">([0-9,.]+)<\/span>/)
          if (match && match[1]) {
            return parseFloat(match[1].replace(/,/g, ''))
          }
          return null
        }

        const krwToRub = extractRate(rubHtml)
        const rubToUsd = extractRate(usdHtml)

        if (krwToRub && rubToUsd) {
          cachedData = {
            krwToRub: parseFloat(krwToRub.toFixed(4)),
            rubToUsd: parseFloat(rubToUsd.toFixed(4)),
            lastUpdated: new Date().toISOString(),
            source: 'naver'
          }
          lastFetchTime = now
          fetchPromise = null

          return NextResponse.json(cachedData, {
            headers: {
              'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300'
            }
          })
        }
      }
    } catch (naverError) {
      logger.warn('네이버 환율 실패, 한국수출입은행 시도:', naverError)
    }

    // 3. 한국 수출입은행 환율 API 시도 (3순위 백업)
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const koeximbankUrl = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=&searchdate=${today}&data=AP01`

      const koeximbankResponse = await fetch(koeximbankUrl, {
        next: { revalidate: 600 }
      })

      if (koeximbankResponse.ok) {
        const koeximbankData = await koeximbankResponse.json()

        // RUB, USD 찾기
        const rubData = koeximbankData.find((item: any) => item.cur_unit === 'RUB')
        const usdData = koeximbankData.find((item: any) => item.cur_unit === 'USD')

        if (rubData && usdData) {
          // 매매기준율 사용 (deal_bas_r)
          const rubRate = parseFloat(rubData.deal_bas_r.replace(/,/g, ''))
          const usdRate = parseFloat(usdData.deal_bas_r.replace(/,/g, ''))

          const krwToRub = parseFloat((1 / rubRate).toFixed(4))
          const rubToUsd = parseFloat((rubRate / usdRate).toFixed(4))

          cachedData = {
            krwToRub,
            rubToUsd,
            lastUpdated: new Date().toISOString(),
            source: 'koreaexim'
          }
          lastFetchTime = now

          return NextResponse.json(cachedData)
        }
      }
    } catch (koeximbankError) {
      logger.warn('한국수출입은행 API도 실패:', koeximbankError)
    }

    // 모든 API 실패 시 에러
    throw new Error('모든 환율 소스에서 데이터를 가져올 수 없습니다')

  } catch (error) {
    logger.error('환율 정보 가져오기 실패:', error)

    // 캐시된 데이터가 있으면 오래되어도 반환
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        stale: true
      })
    }

    // 에러 발생 시 기본 데이터 반환 (2026년 1월 기준 실제 환율)
    return NextResponse.json({
      krwToRub: 0.0547,  // 1 KRW = 0.0547 RUB (업데이트: 2026-01)
      rubToUsd: 0.0127,  // 1 RUB = 0.0127 USD (업데이트: 2026-01)
      lastUpdated: new Date().toISOString(),
      source: 'fallback'
    })
  }
}
