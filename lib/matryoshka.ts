export const MATRYOSHKA_LEVELS = {
  1: { name: '마트료시카 1단계', color: '#EF4444', emoji: '🪆' }, // 빨강
  2: { name: '마트료시카 2단계', color: '#F97316', emoji: '🪆' }, // 주황
  3: { name: '마트료시카 3단계', color: '#EAB308', emoji: '🪆' }, // 노랑
  4: { name: '마트료시카 4단계', color: '#22C55E', emoji: '🪆' }, // 초록
  5: { name: '마트료시카 5단계', color: '#3B82F6', emoji: '🪆' }, // 파랑
  6: { name: '관리자', color: '#6366F1', emoji: '🪆', role: 'admin' }, // 남색
  7: { name: '개발자', color: '#A855F7', emoji: '🪆', role: 'developer' }, // 보라
} as const

export function getMatryoshkaInfo(level: number, role?: string) {
  if (role === 'developer') return MATRYOSHKA_LEVELS[7]
  if (role === 'admin') return MATRYOSHKA_LEVELS[6]

  const validLevel = Math.min(Math.max(level, 1), 5) as keyof typeof MATRYOSHKA_LEVELS
  return MATRYOSHKA_LEVELS[validLevel]
}

export function getMatryoshkaDescription(level: number, role?: string): string {
  if (role === 'developer') return '피크닉 개발자'
  if (role === 'admin') return '피크닉 관리자'

  const descriptions = {
    1: '새싹 회원',
    2: '활동 회원',
    3: '신뢰 회원',
    4: '우수 회원',
    5: '전문 회원',
  }

  return descriptions[level as keyof typeof descriptions] || '회원'
}
