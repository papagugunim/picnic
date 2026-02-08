/**
 * 재미있는 로딩 메시지 유틸리티
 * 피크닉 테마와 러시아 문화를 반영한 다양한 로딩 메시지
 */

const LOADING_MESSAGES = [
  '뺘쪼르치까에서 장 보는 중... 🛒',
  '메트로 환승하는 중... 🚇',
  '보르시 한 그릇 끓이는 중... 🍲',
  '펠메니 빚는 중... 🥟',
  '블리니에 스메타나 올리는 중... 🥞',
  '마르슈르트까 기다리는 중... 🚐',
  '프롭까에 갇혀 있는 중... 🚗',
  '다차에서 샤슬릭 굽는 중... 🍖',
  '크바스 한 잔 따르는 중... 🍺',
  '우샨까 쓰고 나가는 중... 🧣',
  '영하 20도에서 버티는 중... 🥶',
  '눈 치우고 오는 중... ❄️',
  '피로시키 하나만 더... 🥟',
  '까샤 저어주는 중... 🥣',
]

/**
 * 랜덤한 로딩 메시지를 반환합니다
 */
export function getRandomLoadingMessage(): string {
  const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length)
  return LOADING_MESSAGES[randomIndex]
}

/**
 * 특정 컨텍스트에 맞는 로딩 메시지를 반환합니다
 */
export function getLoadingMessage(context?: 'profile' | 'chat' | 'post' | 'settings'): string {
  switch (context) {
    case 'profile':
      return '마뜨료시까 열어보는 중... 🪆'
    case 'chat':
      return '메트로에서 와이파이 잡는 중... 💬'
    case 'post':
      return '뺘쪼르치까 돌아보는 중... 📦'
    case 'settings':
      return '나스뜨로이까 만지는 중... ⚙️'
    default:
      return getRandomLoadingMessage()
  }
}
