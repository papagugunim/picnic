'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { MILK_BOOST_COST, MILK_BOOST_DURATION_HOURS } from '@/lib/milk-points'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MilkPointTransaction {
  id: string
  amount: number
  balance_after: number
  reason: string
  created_at: string
}

interface MilkPointModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPoints?: number | null
  isUnlimited?: boolean
}

function getTransactionReasonLabel(reason: string): string {
  switch (reason) {
    case 'welcome_bonus':
      return '웰컴 보너스'
    case 'welcome_bonus_adjustment':
      return '웰컴 보너스 보정'
    case 'bread_level_up_bonus':
      return '브레드 등급 상승 보너스'
    case 'free_share_completion_bonus':
      return '무료나눔 완료 보너스'
    case 'post_like_reward':
      return '내 게시글 좋아요 적립'
    case 'my_like_action_reward':
      return '좋아요 누르기 적립'
    case 'community_like_reward':
      return '커뮤니티 좋아요 적립'
    case 'community_comment_reward':
      return '댓글 적립'
    case 'my_comment_action_reward':
      return '댓글 작성 적립'
    case 'boost_spend':
      return '밀크 부스트 사용'
    case 'boost_spend_unlimited':
      return '밀크 부스트 사용(무제한)'
    case 'admin_grant':
      return '관리자 지급'
    case 'daily_role_bonus':
      return '일일 등급 보너스'
    default:
      return reason
  }
}

function formatPoints(value: number): string {
  return `${value.toLocaleString()}P`
}

function formatHistoryDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}

export function MilkPointModal({
  open,
  onOpenChange,
  currentPoints,
  isUnlimited = false,
}: MilkPointModalProps) {
  const [history, setHistory] = useState<MilkPointTransaction[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const historySummary = useMemo(() => {
    const earned = history.reduce((sum, item) => (
      item.amount > 0 ? sum + item.amount : sum
    ), 0)
    const spent = history.reduce((sum, item) => (
      item.amount < 0 ? sum + Math.abs(item.amount) : sum
    ), 0)

    return { earned, spent }
  }, [history])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function loadHistory() {
      try {
        setIsLoadingHistory(true)
        setHistoryError(null)

        const supabase = createClient()
        const { data, error } = await supabase
          .from('milk_point_transactions')
          .select('id, amount, balance_after, reason, created_at')
          .order('created_at', { ascending: false })
          .limit(20)

        if (cancelled) return

        if (error) {
          setHistory([])
          setHistoryError('내역을 불러오지 못했습니다.')
          return
        }

        setHistory((data || []) as MilkPointTransaction[])
      } catch {
        if (cancelled) return
        setHistory([])
        setHistoryError('내역을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false)
        }
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [open])

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
                  {isUnlimited ? '내 밀크 포인트 무제한 ∞' : `내 밀크 포인트 ${currentPoints ?? '...'}P`}
                </div>
                {isUnlimited && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    개발자 등급 혜택으로 밀크 부스트를 무제한으로 사용할 수 있습니다.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">내 밀크 포인트 적립/사용 내역</h3>
                  <span className="text-xs text-muted-foreground">최근 20건</span>
                </div>
                {isLoadingHistory ? (
                  <p className="text-sm text-muted-foreground">내역을 불러오는 중입니다...</p>
                ) : historyError ? (
                  <p className="text-sm text-destructive">{historyError}</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">아직 포인트 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="mb-1 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">적립 합계</p>
                        <p className="text-sm font-semibold text-emerald-700">+{formatPoints(historySummary.earned)}</p>
                      </div>
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground">사용 합계</p>
                        <p className="text-sm font-semibold text-rose-700">-{formatPoints(historySummary.spent)}</p>
                      </div>
                    </div>
                    {history.map((item) => {
                      const isEarned = item.amount > 0
                      const isSpent = item.amount < 0
                      const typeLabel = isEarned ? '적립' : isSpent ? '사용' : '기타'
                      return (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-border/80 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                              <span
                                className={`inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                  isEarned
                                    ? 'bg-emerald-500/15 text-emerald-700'
                                    : isSpent
                                      ? 'bg-rose-500/15 text-rose-700'
                                      : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {typeLabel}
                              </span>
                              {getTransactionReasonLabel(item.reason)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatHistoryDate(item.created_at)} · 잔액 {formatPoints(item.balance_after)}
                            </p>
                          </div>
                          <span className={`shrink-0 text-sm font-semibold ${
                            isEarned ? 'text-emerald-600' : isSpent ? 'text-rose-600' : 'text-muted-foreground'
                          }`}>
                            {item.amount > 0 ? '+' : ''}{formatPoints(item.amount)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">어떻게 쌓이나요?</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>웰컴 보너스: 가입 완료 시 +1,000P</li>
                  <li>브레드 등급 상승: 등급이 올라갈 때마다 +1,000P</li>
                  <li>중고거래 무료나눔 판매 완료: +1,000P</li>
                  <li>내 게시글에 받은 좋아요: 1개당 +5P</li>
                  <li>내가 누른 좋아요: 1개당 +1P</li>
                  <li>내 게시글에 받은 댓글: 1개당 +10P</li>
                  <li>내가 남긴 댓글: 1개당 +10P</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">어떻게 사용하나요?</h3>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>본인 게시글에만 밀크 부스트를 적용할 수 있습니다.</li>
                  <li>1회 사용량: {MILK_BOOST_COST}P (고정)</li>
                  <li>부스트가 적용되지 않은 게시글에만 사용할 수 있습니다.</li>
                  <li>부스트 종료 후 다시 부스트를 적용할 수 있습니다.</li>
                  <li>부스트 적용 시간: {MILK_BOOST_DURATION_HOURS}시간</li>
                </ul>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">상단 노출은 어떻게 되나요?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  최근 3일 게시글은 좋아요/댓글 등 반응 점수에 밀크 부스트 점수가 더해져 추천순으로 정렬됩니다.
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
