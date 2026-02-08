/**
 * 재미있는 로딩 메시지 유틸리티
 * 러시아 한인 생활을 반영한 계절별 로딩 메시지
 */

/** 사계절 공통 */
const COMMON_MESSAGES = [
  '메트로 환승하는 중... 🚇',
  '보르시 한 그릇 끓이는 중... 🍲',
  '펠메니 빚는 중... 🥟',
  '블리니에 스메타나 올리는 중... 🥞',
  '프롭까에 갇혀 있는 중... 🚗',
  '피로시키 하나만 더... 🥟',
  '바부시까한테 혼나는 중... 👵',
  '김치 담글 배추 찾는 중... 🥬',
  '마가진에서 고르는 중... 🏪',
  '"빠니마유" 연발하는 중... 🗣️',
  '미그라치온까 줄 서는 중... 🏢',
  '마르슈르트까 기다리는 중... 🚐',
]

/** 겨울 (12, 1, 2월) */
const WINTER_MESSAGES = [
  '영하 20도에서 버티는 중... 🥶',
  '눈 치우고 오는 중... ❄️',
  '3시인데 벌써 깜깜한 중... 🌙',
  '이웃집 레몬뜨 소리 참는 중... 🔨',
  '핫초코 한 잔 타는 중... ☕',
  '빙판길 조심조심 걷는 중... 🧊',
  '크바스 대신 따뜻한 차 한 잔... ☕',
]

/** 봄 (3, 4, 5월) */
const SPRING_MESSAGES = [
  '드디어 해가 길어지는 중... ☀️',
  '눈 녹은 물웅덩이 피하는 중... 💧',
  '겨울옷 정리하는 중... 🧥',
  '공원에서 산책하는 중... 🌷',
  '다차 시즌 준비하는 중... 🌱',
]

/** 여름 (6, 7, 8월) */
const SUMMER_MESSAGES = [
  '여름인데 온수가 끊겼다... 🚿',
  '다차에서 샤슬릭 굽는 중... 🍖',
  '크바스 한 잔 따르는 중... 🍺',
  '백야라 잠이 안 와... 🌅',
  '반야에서 땀 빼는 중... 🧖',
  '공원에서 피크닉 펴는 중... 🧺',
  '아이스크림 녹기 전에 빨리... 🍦',
]

/** 가을 (9, 10, 11월) */
const FALL_MESSAGES = [
  '자작나무 숲 산책 중... 🍂',
  '따뜻한 보르시가 그리운 중... 🍲',
  '비 오는 날 메트로가 최고... 🌧️',
  '다차에서 수확하는 중... 🍎',
  '이웃집 레몬뜨 소리 참는 중... 🔨',
]

function getSeason(): 'winter' | 'spring' | 'summer' | 'fall' {
  const month = new Date().getMonth() + 1
  if (month <= 2 || month === 12) return 'winter'
  if (month <= 5) return 'spring'
  if (month <= 8) return 'summer'
  return 'fall'
}

function getSeasonalMessages(): string[] {
  const season = getSeason()
  switch (season) {
    case 'winter': return WINTER_MESSAGES
    case 'spring': return SPRING_MESSAGES
    case 'summer': return SUMMER_MESSAGES
    case 'fall': return FALL_MESSAGES
  }
}

/**
 * 랜덤한 로딩 메시지를 반환합니다 (계절 반영)
 */
export function getRandomLoadingMessage(): string {
  const pool = [...COMMON_MESSAGES, ...getSeasonalMessages()]
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * 특정 컨텍스트에 맞는 로딩 메시지를 반환합니다
 */
export function getLoadingMessage(context?: 'profile' | 'chat' | 'post' | 'settings'): string {
  switch (context) {
    case 'profile':
      return '마뜨료시까 열어보는 중... 🪆'
    case 'chat':
      return '채팅방으로 이동 중... 💬'
    case 'post':
      return '마가진 돌아보는 중... 🏪'
    case 'settings':
      return '설정 만지는 중... ⚙️'
    default:
      return getRandomLoadingMessage()
  }
}
