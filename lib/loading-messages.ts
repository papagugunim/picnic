/**
 * 재미있는 로딩 메시지 유틸리티
 * 피크닉 테마와 러시아 문화를 반영한 다양한 로딩 메시지
 */

const LOADING_MESSAGES = [
  '피크닉 준비 중... 🧺',
  '돗자리를 펴는 중... 🏞️',
  '바구니를 챙기는 중... 🧺',
  '빵을 굽는 중... 🍞',
  '보르시를 끓이는 중... 🍲',
  '피로시키를 굽는 중... 🥟',
  '차이를 우려내는 중... ☕',
  '지하철을 타고 가는 중... 🚇',
  '빵과 소금을 준비하는 중... 🍞',
  '발랄라이카 조율 중... 🎵',
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
      return '프로필을 불러오는 중... 🪆'
    case 'chat':
      return '채팅방으로 이동 중... 💬'
    case 'post':
      return '게시물을 가져오는 중... 📦'
    case 'settings':
      return '설정을 불러오는 중... ⚙️'
    default:
      return getRandomLoadingMessage()
  }
}
