'use client'

import { X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MilkPointModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPoints?: number | null
}

export function MilkPointModal({
  open,
  onOpenChange,
  currentPoints,
}: MilkPointModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="!left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !max-w-none !h-[100dvh] !rounded-none !border-0 !p-0 overflow-hidden"
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
          <DialogHeader className="sticky top-0 z-10 border-b bg-background px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base font-semibold sm:text-lg">밀크 포인트 제도 안내</DialogTitle>
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
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-8 pt-4 sm:px-6"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="mx-auto w-full max-w-3xl space-y-4">
              <section className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">현재 보유 포인트</p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                  <span role="img" aria-label="우유">🥛</span>
                  내 밀크 포인트 {currentPoints ?? '...'}P
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">어떻게 쌓이나요?</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>가입 시 웰컴 보너스 +30P</li>
                  <li>중고거래 게시글 좋아요를 받으면 +1P</li>
                  <li>동네생활 게시글/댓글 좋아요를 받으면 +1P</li>
                  <li>동네생활 게시글에 댓글이 달리면 +2P (하루 1회 기준)</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">어떻게 사용하나요?</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>본인 게시글에만 밀크 부스트를 적용할 수 있습니다.</li>
                  <li>사용 범위: 1회 1~200P</li>
                  <li>노출 가중치: 사용 포인트 × 3점</li>
                  <li>적용 시간: 1~72시간</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">상단 노출은 어떻게 되나요?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  최근 3일 게시글은 좋아요/관심/조회 기반 점수에 밀크 부스트 점수가 더해져 추천순으로 정렬됩니다.
                  점수가 같으면 최신 게시글이 먼저 노출됩니다.
                </p>
              </section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
