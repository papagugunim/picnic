export const CITIES = {
  MOSCOW: 'Moscow',
  SPB: 'Saint Petersburg'
} as const

export const MOSCOW_NEIGHBORHOODS = [
  { value: 'Arbat', label: 'Arbat (Арбат)', labelRu: 'Арбат' },
  { value: 'Tverskoy', label: 'Tverskoy (Тверской)', labelRu: 'Тверской' },
  { value: 'Presnensky', label: 'Presnensky (Пресненский)', labelRu: 'Пресненский' },
  { value: 'Khamovniki', label: 'Khamovniki (Хамовники)', labelRu: 'Хамовники' },
  { value: 'Zamoskvorechye', label: 'Zamoskvorechye (Замоскворечье)', labelRu: 'Замоскворечье' },
  { value: 'Basmanny', label: 'Basmanny (Басманный)', labelRu: 'Басманный' },
  { value: 'Tagansky', label: 'Tagansky (Таганский)', labelRu: 'Таганский' },
  { value: 'Yakimanka', label: 'Yakimanka (Якиманка)', labelRu: 'Якиманка' },
] as const

export const SPB_NEIGHBORHOODS = [
  { value: 'Nevsky', label: 'Nevsky District (Невский район)', labelRu: 'Невский район' },
  { value: 'Admiralteysky', label: 'Admiralteysky (Адмиралтейский)', labelRu: 'Адмиралтейский' },
  { value: 'Vasileostrovsky', label: 'Vasileostrovsky (Василеостровский)', labelRu: 'Василеостровский' },
  { value: 'Petrogradsky', label: 'Petrogradsky (Петроградский)', labelRu: 'Петроградский' },
  { value: 'Moskovsky', label: 'Moskovsky (Московский)', labelRu: 'Московский' },
] as const

export const CATEGORIES = [
  { value: 'electronics', label: '전자제품' },
  { value: 'furniture', label: '가구/인테리어' },
  { value: 'clothing', label: '의류/잡화' },
  { value: 'books', label: '도서' },
  { value: 'sports', label: '스포츠/레저' },
  { value: 'beauty', label: '뷰티/미용' },
  { value: 'baby', label: '유아동' },
  { value: 'food', label: '식품' },
  { value: 'vehicles', label: '자동차' },
  { value: 'realestate', label: '부동산' },
  { value: 'jobs', label: '구직/구인' },
  { value: 'handcarry', label: '핸드캐리' },
  { value: 'finance', label: '금융' },
  { value: 'other', label: '기타' },
] as const

export const CONDITIONS = [
  { value: 'new', label: '새상품' },
  { value: 'like_new', label: '거의 새것' },
  { value: 'good', label: '사용감 적음' },
  { value: 'fair', label: '사용감 많음' },
] as const

export const TRADE_METHODS = [
  { value: 'direct', label: '직거래' },
  { value: 'delivery', label: '택배' },
] as const

export const POST_STATUS = {
  ACTIVE: 'active',
  RESERVED: 'reserved',
  SOLD: 'sold',
  HIDDEN: 'hidden'
} as const

export const CONTACT_METHODS = [
  { value: 'chat', label: '피크닉 채팅' },
  { value: 'phone', label: '전화' },
  { value: 'telegram', label: '텔레그램' },
  { value: 'kakao', label: '카카오톡' },
] as const

// Metro 데이터는 lib/metro-data.ts로 분리됨 (lazy load 최적화)
// 사용처에서 const { MOSCOW_METRO_STATIONS } = await import('@/lib/metro-data') 패턴으로 사용

/**
 * 도시 영문 키를 한국어 이름으로 변환
 */
export function getCityNameInKorean(city: string): string {
  const cityMap: { [key: string]: string } = {
    'moscow': '모스크바',
    'saint_petersburg': '상트페테르부르크',
    'vladivostok': '블라디보스토크',
    'khabarovsk': '하바롭스크',
    'irkutsk': '이르쿠츠크',
  }
  return cityMap[city.toLowerCase()] || city
}
