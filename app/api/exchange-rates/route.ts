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

export async function GET() {
  try {
    // 캐시된 데이터가 있고 10분 이내면 캐시 반환
    const now = Date.now()
    if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
      return NextResponse.json({
        ...cachedData,
        cached: true
      })
    }

    // 1. 한국 수출입은행 환율 API 시도 (가장 정확)
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
      console.warn('한국수출입은행 API 실패:', koeximbankError)
    }

    // 2. ExchangeRate-API 시도 (대체)
    try {
      const fallbackResponse = await fetch('https://api.exchangerate-api.com/v4/latest/KRW', {
        next: { revalidate: 600 }
      })

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        const krwToRub = parseFloat((fallbackData.rates.RUB || 0.075).toFixed(4))
        const rubToUsd = parseFloat(((fallbackData.rates.USD / fallbackData.rates.RUB) || 0.011).toFixed(4))

        cachedData = {
          krwToRub,
          rubToUsd,
          lastUpdated: new Date().toISOString(),
          source: 'api'
        }
        lastFetchTime = now

        return NextResponse.json(cachedData)
      }
    } catch (apiError) {
      console.warn('ExchangeRate API 실패, 네이버 시도:', apiError)
    }

    // 대체 API 실패 시 네이버 시도
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

    if (!rubResponse.ok || !usdResponse.ok) {
      throw new Error('네이버 환율 정보를 가져올 수 없습니다')
    }

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

    if (!krwToRub || !rubToUsd) {
      throw new Error('네이버에서 환율 추출 실패')
    }

    cachedData = {
      krwToRub: parseFloat(krwToRub.toFixed(4)),
      rubToUsd: parseFloat(rubToUsd.toFixed(4)),
      lastUpdated: new Date().toISOString(),
      source: 'naver'
    }
    lastFetchTime = now

    return NextResponse.json(cachedData)

  } catch (error) {
    console.error('환율 정보 가져오기 실패:', error)

    // 캐시된 데이터가 있으면 오래되어도 반환
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        stale: true
      })
    }

    // 에러 발생 시 기본 데이터 반환
    return NextResponse.json({
      krwToRub: 0.075,
      rubToUsd: 0.011,
      lastUpdated: new Date().toISOString(),
      source: 'fallback'
    })
  }
}
