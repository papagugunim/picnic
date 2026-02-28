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
  BreadLevel,
  getBreadDescription,
  getBreadInfo,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="!left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !max-w-none !h-[100dvh] !rounded-none !border-0 !p-0 overflow-hidden"
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
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

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:px-6"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="mx-auto w-full max-w-4xl space-y-3">
              <section className="rounded-2xl border border-border bg-card p-3.5">
                <p className="mb-1 text-xs text-muted-foreground">현재 등급</p>
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold"
                  style={{ backgroundColor: currentInfo.color }}
                >
                  <span className="text-base">{currentInfo.emoji}</span>
                  <span className={isSpecialRole ? 'text-white' : 'text-slate-800'}>
                    {currentInfo.name} · {currentDescription}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {isSpecialRole
                    ? '관리/개발 계정은 역할 기반 특별 등급으로 운영됩니다.'
                    : `현재 활동 점수 ${currentScore.toLocaleString()}점 · 거래 완료, 리뷰, 커뮤니티 활동이 쌓이면 등급이 자동으로 성장합니다.`}
                </p>
              </section>

              <section className="rounded-2xl border border-border bg-card p-3.5">
                <h3 className="mb-2 text-sm font-semibold">일반 등급</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {([1, 2, 3, 4, 5] as BreadLevel[]).map((level) => {
                    const info = BREAD_LEVELS[level]
                    const isCurrent = !isSpecialRole && currentLevel === level

                    return (
                      <div
                        key={level}
                        className={`rounded-xl border bg-background px-2 py-2 text-center ${
                          isCurrent ? 'border-primary/60 ring-1 ring-primary/20' : 'border-border'
                        }`}
                      >
                        <p className="text-base leading-none">{info.emoji}</p>
                        <p className="mt-1 text-[12px] font-semibold">{info.name}</p>
                        <p className="text-[11px] text-muted-foreground">{getBreadDescription(level)}</p>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  식빵 → 바게트 → 크로아상 → 쁘레첼 → 베이글
                </p>
              </section>

              <section className="rounded-2xl border border-border bg-card p-3.5">
                <h3 className="mb-2 text-sm font-semibold">특별 등급</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-indigo-300/40 bg-indigo-500/5 px-2 py-2 text-center">
                    <p className="text-base">{BREAD_LEVELS[6].emoji}</p>
                    <p className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400">{BREAD_LEVELS[6].name}</p>
                    <p className="text-[11px] text-muted-foreground">관리자</p>
                  </div>
                  <div className="rounded-xl border border-purple-300/40 bg-purple-500/5 px-2 py-2 text-center">
                    <p className="text-base">{BREAD_LEVELS[7].emoji}</p>
                    <p className="text-[12px] font-semibold text-purple-600 dark:text-purple-400">{BREAD_LEVELS[7].name}</p>
                    <p className="text-[11px] text-muted-foreground">개발자</p>
                  </div>
                </div>
              </section>

              {scoreBreakdown && !isSpecialRole && (
                <section className="rounded-2xl border border-border bg-card p-3.5">
                  <h3 className="mb-1 text-sm font-semibold">내 활동 요약</h3>
                  <p className="text-xs text-muted-foreground">
                    거래 {scoreBreakdown.soldCount}건 · 받은 리뷰 {scoreBreakdown.receivedReviews}건 · 평균 평점 {scoreBreakdown.averageRating.toFixed(1)}
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
