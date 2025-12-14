export const MATRYOSHKA_LEVELS = {
  1: { name: '식빵', color: '#FFF8DC', icon: '/icons/bread-1.svg' }, // 콘실크 (밝은 크림색)
  2: { name: '바게트', color: '#F5DEB3', icon: '/icons/bread-2.svg' }, // 밀색
  3: { name: '크로아상', color: '#FFD700', icon: '/icons/bread-3.svg' }, // 황금색
  4: { name: '쁘레첼', color: '#DAA520', icon: '/icons/bread-4.svg' }, // 골든로드
  5: { name: '베이글', color: '#CD853F', icon: '/icons/bread-5.svg' }, // 페루 (중간 갈색)
  6: { name: '샌드위치', color: '#6366F1', icon: '/icons/bread-6.svg', role: 'admin' }, // 남색
  7: { name: '햄버거', color: '#A855F7', icon: '/icons/bread-7.svg', role: 'developer' }, // 보라
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
