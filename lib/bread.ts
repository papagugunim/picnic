/**
 * 브레드 등급 시스템
 * - 일반 회원: 점수 기반 1~5 레벨
 * - 특별 회원: 역할 기반 6~7 레벨
 */

export const BREAD_LEVELS = {
  1: { name: '식빵', emoji: '🍞', color: '#FFF8DC', icon: '/branding/external/bread-from-user-transparent.png' },
  2: { name: '바게트', emoji: '🥖', color: '#F5DEB3', icon: '/branding/external/bread-from-user-transparent.png' },
  3: { name: '크로아상', emoji: '🥐', color: '#FFD700', icon: '/branding/external/bread-from-user-transparent.png' },
  4: { name: '쁘레첼', emoji: '🥨', color: '#DAA520', icon: '/branding/external/bread-from-user-transparent.png' },
  5: { name: '베이글', emoji: '🥯', color: '#CD853F', icon: '/branding/external/bread-from-user-transparent.png' },
  6: { name: '샌드위치', emoji: '🥪', color: '#6366F1', icon: '/branding/external/bread-from-user-transparent.png', role: 'admin' },
  7: { name: '햄버거', emoji: '🍔', color: '#A855F7', icon: '/branding/external/bread-from-user-transparent.png', role: 'developer' },
} as const

export type BreadLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type BreadRegularLevel = 1 | 2 | 3 | 4 | 5

export interface BreadInfo {
  name: string
  emoji: string
  color: string
  icon: string
  role?: string
}

export interface BreadLevelRule {
  level: BreadRegularLevel
  scoreMin: number
  scoreMax: number | null
  subtitle: string
  description: string
}

export interface BreadProgressInfo {
  score: number
  level: BreadRegularLevel
  nextLevel: BreadRegularLevel | null
  pointsToNext: number
  progressPercent: number
}

export const BREAD_LEVEL_RULES: BreadLevelRule[] = [
  {
    level: 1,
    scoreMin: 0,
    scoreMax: 29,
    subtitle: '새싹 회원',
    description: '피크닉을 처음 시작한 회원입니다.',
  },
  {
    level: 2,
    scoreMin: 30,
    scoreMax: 79,
    subtitle: '활동 회원',
    description: '거래와 커뮤니티에 꾸준히 참여하는 회원입니다.',
  },
  {
    level: 3,
    scoreMin: 80,
    scoreMax: 149,
    subtitle: '신뢰 회원',
    description: '안정적인 거래 이력과 좋은 평가를 보유한 회원입니다.',
  },
  {
    level: 4,
    scoreMin: 150,
    scoreMax: 239,
    subtitle: '우수 회원',
    description: '커뮤니티 기여도와 거래 품질이 모두 높은 회원입니다.',
  },
  {
    level: 5,
    scoreMin: 240,
    scoreMax: null,
    subtitle: '전문 회원',
    description: '장기 활동과 신뢰를 모두 쌓은 상위 회원입니다.',
  },
]

export const BREAD_SCORE_FACTORS = {
  completedSale: 25,
  receivedReview: 8,
  reviewRatingPoint: 4,
  communityLike: 1,
} as const

function clampRegularLevel(level: number): BreadRegularLevel {
  return Math.min(Math.max(level, 1), 5) as BreadRegularLevel
}

function getRegularRule(level: number): BreadLevelRule {
  const clamped = clampRegularLevel(level)
  return BREAD_LEVEL_RULES.find((rule) => rule.level === clamped) || BREAD_LEVEL_RULES[0]
}

/**
 * 브레드 레벨에 해당하는 정보를 반환합니다.
 */
export function getBreadInfo(level: number, role?: string): BreadInfo {
  if (role === 'developer') return BREAD_LEVELS[7]
  if (role === 'admin') return BREAD_LEVELS[6]

  const validLevel = clampRegularLevel(level)
  return BREAD_LEVELS[validLevel]
}

/**
 * 브레드 레벨에 대한 설명(서브타이틀)을 반환합니다.
 */
export function getBreadDescription(level: number, role?: string): string {
  if (role === 'developer') return '피크닉 개발자'
  if (role === 'admin') return '피크닉 관리자'

  return getRegularRule(level).subtitle
}

/**
 * 브레드 레벨에 대한 점수 범위를 반환합니다.
 */
export function getBreadScoreRange(level: number, role?: string): string {
  if (role === 'developer' || role === 'admin') {
    return '시스템 권한 등급'
  }

  const rule = getRegularRule(level)
  if (rule.scoreMax === null) {
    return `${rule.scoreMin}점 이상`
  }

  return `${rule.scoreMin} ~ ${rule.scoreMax}점`
}

/**
 * 점수로 일반 회원 브레드 레벨(1~5)을 계산합니다.
 */
export function getBreadLevelByScore(score: number): BreadRegularLevel {
  const safeScore = Math.max(0, Math.floor(score))

  for (let i = BREAD_LEVEL_RULES.length - 1; i >= 0; i -= 1) {
    const rule = BREAD_LEVEL_RULES[i]
    if (safeScore >= rule.scoreMin) {
      return rule.level
    }
  }

  return 1
}

/**
 * 점수 기반 다음 레벨 진행 상태를 반환합니다.
 */
export function getBreadProgress(score: number): BreadProgressInfo {
  const safeScore = Math.max(0, Math.floor(score))
  const level = getBreadLevelByScore(safeScore)
  const currentRule = getRegularRule(level)
  const nextLevel = level < 5 ? ((level + 1) as BreadRegularLevel) : null

  if (!nextLevel) {
    return {
      score: safeScore,
      level,
      nextLevel: null,
      pointsToNext: 0,
      progressPercent: 100,
    }
  }

  const nextRule = getRegularRule(nextLevel)
  const levelSpan = Math.max(nextRule.scoreMin - currentRule.scoreMin, 1)
  const progressInLevel = Math.min(Math.max(safeScore - currentRule.scoreMin, 0), levelSpan)

  return {
    score: safeScore,
    level,
    nextLevel,
    pointsToNext: Math.max(nextRule.scoreMin - safeScore, 0),
    progressPercent: Math.round((progressInLevel / levelSpan) * 100),
  }
}

/**
 * 브레드 레벨에 해당하는 이모지를 반환합니다.
 */
export function getBreadEmoji(level: number, role?: string): string {
  return getBreadInfo(level, role).emoji
}
