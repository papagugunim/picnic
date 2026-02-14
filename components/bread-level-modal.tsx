'use client'

import { X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  BREAD_LEVELS,
  BREAD_LEVEL_RULES,
  BREAD_SCORE_FACTORS,
  BreadLevel,
  getBreadDescription,
  getBreadInfo,
  getBreadLevelByScore,
  getBreadProgress,
  getBreadScoreRange,
} from '@/lib/bread'

interface BreadScoreBreakdown {
  totalScore: number
  soldCount: number
  salesScore: number
  receivedReviews: number
  averageRating: number
  reviewScore: number
  communityLikesScore: number
  suggestedLevel: number
}

interface BreadLevelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLevel?: number
  currentRole?: string | null
  currentScore?: number
  scoreBreakdown?: BreadScoreBreakdown | null
}

export function BreadLevelModal({
  open,
  onOpenChange,
  currentLevel = 1,
  currentRole,
  currentScore = 0,
  scoreBreakdown,
}: BreadLevelModalProps) {
  const role = currentRole || undefined
  const currentInfo = getBreadInfo(currentLevel, role)
  const currentDescription = getBreadDescription(currentLevel, role)
  const isSpecialRole = role === 'admin' || role === 'developer'
  const scoreLevel = getBreadLevelByScore(currentScore)
  const progress = getBreadProgress(currentScore)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="!left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !max-w-none !h-[100dvh] !rounded-none !border-0 !p-0"
      >
        <div className="flex h-full flex-col bg-background">
          <DialogHeader className="sticky top-0 z-10 border-b bg-background px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base font-semibold sm:text-lg">브레드 등급 시스템</DialogTitle>
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6">
            <div className="mx-auto w-full max-w-5xl space-y-5">
              <section className="rounded-2xl border border-border bg-card p-4">
                <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr] lg:items-center">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">현재 등급</p>
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold" style={{ backgroundColor: currentInfo.color }}>
                      <span className="text-base">{currentInfo.emoji}</span>
                      <span className={isSpecialRole ? 'text-white' : 'text-slate-800'}>
                        {currentInfo.name} · {currentDescription}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isSpecialRole
                        ? '관리/개발 계정은 점수 기반이 아닌 역할 기반 특별 등급으로 관리됩니다.'
                        : `현재 브레드 점수 ${currentScore.toLocaleString()}점 (점수 기준 등급: ${BREAD_LEVELS[scoreLevel].name})`}
                    </p>
                  </div>

                  {!isSpecialRole && (
                    <div className="rounded-xl border border-border bg-background p-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>다음 등급 진행률</span>
                        <span>{progress.progressPercent}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted">
                        <div
                          className="h-2.5 rounded-full bg-primary transition-all"
                          style={{ width: `${progress.progressPercent}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{BREAD_LEVELS[progress.level].name}</span>
                        {progress.nextLevel ? (
                          <span>
                            다음: {BREAD_LEVELS[progress.nextLevel].name} ({progress.pointsToNext}점 남음)
                          </span>
                        ) : (
                          <span>최고 등급</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">일반 회원 등급 (점수 기반)</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {([1, 2, 3, 4, 5] as BreadLevel[]).map((level) => {
                    const info = BREAD_LEVELS[level]
                    const rule = BREAD_LEVEL_RULES.find((item) => item.level === level)
                    if (!rule) return null

                    return (
                      <div
                        key={level}
                        className="rounded-xl border border-border bg-background p-3"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                            style={{ backgroundColor: info.color }}
                          >
                            {info.emoji}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{info.name}</p>
                            <p className="text-xs text-muted-foreground">{rule.subtitle}</p>
                          </div>
                        </div>
                        <p className="mb-1 text-xs font-medium text-primary">
                          점수: {getBreadScoreRange(level)}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {rule.description}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">특별 등급 (권한 기반)</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-indigo-300/40 bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 p-3">
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      <span className="text-lg">{BREAD_LEVELS[6].emoji}</span>
                      {BREAD_LEVELS[6].name} · 피크닉 관리자
                    </div>
                    <p className="text-xs text-muted-foreground">커뮤니티 운영과 정책 관리를 담당합니다.</p>
                  </div>
                  <div className="rounded-xl border border-purple-300/40 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-3">
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
                      <span className="text-lg">{BREAD_LEVELS[7].emoji}</span>
                      {BREAD_LEVELS[7].name} · 피크닉 개발자
                    </div>
                    <p className="text-xs text-muted-foreground">서비스 개발 및 시스템 유지보수를 담당합니다.</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">등급 산정 기준</h3>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    거래 완료 1건당 +{BREAD_SCORE_FACTORS.completedSale}점
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    받은 리뷰 1건당 +{BREAD_SCORE_FACTORS.receivedReview}점
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    리뷰 평점 1점당 +{BREAD_SCORE_FACTORS.reviewRatingPoint}점
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2">
                    커뮤니티 좋아요 1개당 +{BREAD_SCORE_FACTORS.communityLike}점
                  </div>
                </div>

                {scoreBreakdown && !isSpecialRole && (
                  <div className="mt-3 rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
                    <p className="mb-2 font-medium text-foreground">내 점수 구성</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <p>거래 완료: {scoreBreakdown.soldCount}건 (+{scoreBreakdown.salesScore}점)</p>
                      <p>받은 리뷰: {scoreBreakdown.receivedReviews}건 (+{scoreBreakdown.reviewScore}점)</p>
                      <p>평균 평점: {scoreBreakdown.averageRating.toFixed(1)}점</p>
                      <p>커뮤니티 좋아요 점수: +{scoreBreakdown.communityLikesScore}점</p>
                    </div>
                    <p className="mt-2 text-foreground">
                      총점 {scoreBreakdown.totalScore}점 / 권장 등급 {BREAD_LEVELS[scoreBreakdown.suggestedLevel as BreadLevel].name}
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
