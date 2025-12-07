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
