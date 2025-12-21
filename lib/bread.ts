/**
 * 브레드 등급 시스템
 * 사용자의 활동에 따라 1-7 레벨의 빵 등급을 부여합니다.
 */

export const BREAD_LEVELS = {
  1: { name: '식빵', emoji: '🍞', color: '#FFF8DC', icon: '/icons/bread-1.svg' },
  2: { name: '바게트', emoji: '🥖', color: '#F5DEB3', icon: '/icons/bread-2.svg' },
  3: { name: '크로아상', emoji: '🥐', color: '#FFD700', icon: '/icons/bread-3.svg' },
  4: { name: '쁘레첼', emoji: '🥨', color: '#DAA520', icon: '/icons/bread-4.svg' },
  5: { name: '베이글', emoji: '🥯', color: '#CD853F', icon: '/icons/bread-5.svg' },
  6: { name: '샌드위치', emoji: '🥪', color: '#6366F1', icon: '/icons/bread-6.svg', role: 'admin' },
  7: { name: '햄버거', emoji: '🍔', color: '#A855F7', icon: '/icons/bread-7.svg', role: 'developer' },
} as const

export type BreadLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface BreadInfo {
  name: string
  emoji: string
  color: string
  icon: string
  role?: string
}

/**
 * 브레드 레벨에 해당하는 정보를 반환합니다.
 * @param level - 브레드 레벨 (1-7)
 * @param role - 사용자 역할 (admin, developer)
 * @returns 브레드 정보 객체
 */
export function getBreadInfo(level: number, role?: string): BreadInfo {
  // 역할 기반 특별 등급
  if (role === 'developer') return BREAD_LEVELS[7]
  if (role === 'admin') return BREAD_LEVELS[6]

  // 일반 사용자 등급 (1-5)
  const validLevel = Math.min(Math.max(level, 1), 5) as BreadLevel
  return BREAD_LEVELS[validLevel]
}

/**
 * 브레드 레벨에 대한 설명을 반환합니다.
 * @param level - 브레드 레벨 (1-7)
 * @param role - 사용자 역할 (admin, developer)
 * @returns 브레드 등급 설명
 */
export function getBreadDescription(level: number, role?: string): string {
  if (role === 'developer') return '피크닉 개발자'
  if (role === 'admin') return '피크닉 관리자'

  const descriptions: Record<number, string> = {
    1: '새싹 회원',
    2: '활동 회원',
    3: '신뢰 회원',
    4: '우수 회원',
    5: '전문 회원',
  }

  return descriptions[level] || '회원'
}

/**
 * 브레드 레벨에 해당하는 이모지를 반환합니다.
 * @param level - 브레드 레벨 (1-7)
 * @param role - 사용자 역할 (admin, developer)
 * @returns 브레드 이모지
 */
export function getBreadEmoji(level: number, role?: string): string {
  const breadInfo = getBreadInfo(level, role)
  return breadInfo.emoji
}
