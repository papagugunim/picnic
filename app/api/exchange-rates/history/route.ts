import { NextResponse } from 'next/server'

// 캐시 저장소 (메모리)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60 * 60 * 1000 // 1시간 캐시

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency') || 'rub' // rub, usd

    // 캐시 키는 currency만 사용 (1년치 데이터를 통째로 캐시)
    const cacheKey = `year-${currency}`

    // 캐시 확인
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        data: cached.data,
        cached: true
      })
    }

    // 1년치 데이터 가져오기 (성능 개선: 한 번만 로드)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 365) // 1년

    // 한국수출입은행 API로 히스토리 데이터 가져오기
    const historyData = []
    const currentDate = new Date(startDate)

    // 날짜별로 환율 데이터 수집 (주말 제외)
    while (currentDate <= endDate) {
      // 주말 건너뛰기
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const dateStr = formatDate(currentDate)

        try {
          const koeximbankUrl = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=&searchdate=${dateStr}&data=AP01`
          const response = await fetch(koeximbankUrl, {
            next: { revalidate: 3600 }
          })

          if (response.ok) {
            const data = await response.json()

            if (currency === 'rub') {
              // RUB/KRW
              const rubData = data.find((item: any) => item.cur_unit === 'RUB')
              if (rubData) {
                const rubRate = parseFloat(rubData.deal_bas_r.replace(/,/g, ''))
                const krwPerRub = parseFloat((1 / rubRate).toFixed(2))

                historyData.push({
                  date: formatDateForDisplay(currentDate),
                  rate: krwPerRub
                })
              }
            } else {
              // USD/RUB
              const rubData = data.find((item: any) => item.cur_unit === 'RUB')
              const usdData = data.find((item: any) => item.cur_unit === 'USD')

              if (rubData && usdData) {
                const rubRate = parseFloat(rubData.deal_bas_r.replace(/,/g, ''))
                const usdRate = parseFloat(usdData.deal_bas_r.replace(/,/g, ''))
                const rubPerUsd = parseFloat((rubRate / usdRate).toFixed(2))

                historyData.push({
                  date: formatDateForDisplay(currentDate),
                  rate: rubPerUsd
                })
              }
            }
          }
        } catch (error) {
          console.error(`날짜 ${dateStr} 환율 데이터 가져오기 실패:`, error)
        }
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // 데이터가 없으면 현재 환율로 대체 데이터 생성
    if (historyData.length === 0) {
      console.warn('히스토리 데이터 없음, 대체 데이터 생성')
      const fallbackData = generateFallbackData('year', currency)

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
    console.error('환율 히스토리 가져오기 실패:', error)

    // 에러 시 대체 데이터
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency') || 'rub'

    return NextResponse.json({
      data: generateFallbackData('year', currency),
      error: true
    })
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

// 대체 데이터 생성 (API 실패 시)
function generateFallbackData(period: string, currency: string) {
  const dataPoints =
    period === 'week' ? 7 :
    period === 'month' ? 30 :
    period === 'quarter' ? 90 :
    365 // year
  const currentRate = currency === 'rub' ? 18 : 90
  const data = []

  for (let i = dataPoints - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)

    // 임시 변동 생성
    const variation = (Math.random() - 0.5) * (currentRate * 0.05)
    const rate = currentRate + variation

    data.push({
      date: formatDateForDisplay(date),
      rate: parseFloat(rate.toFixed(2))
    })
  }

  return data
}
