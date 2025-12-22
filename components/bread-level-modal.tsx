'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BREAD_LEVELS, BreadLevel } from '@/lib/bread'

interface BreadLevelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BreadLevelModal({ open, onOpenChange }: BreadLevelModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">🍞 브레드 등급 시스템</DialogTitle>
          <DialogDescription>
            피크닉에서는 활동에 따라 다양한 빵 등급을 받을 수 있습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 일반 사용자 등급 (1-5) */}
          <div>
            <h3 className="text-lg font-semibold mb-3">일반 회원 등급</h3>
            <div className="space-y-3">
              {([1, 2, 3, 4, 5] as BreadLevel[]).map((level) => {
                const breadInfo = BREAD_LEVELS[level]
                const descriptions: Record<number, string> = {
                  1: '새싹 회원 - 피크닉을 처음 시작한 회원입니다',
                  2: '활동 회원 - 꾸준히 활동하는 회원입니다',
                  3: '신뢰 회원 - 신뢰할 수 있는 거래 내역을 쌓은 회원입니다',
                  4: '우수 회원 - 커뮤니티에서 활발히 활동하는 우수 회원입니다',
                  5: '전문 회원 - 많은 경험과 신뢰를 쌓은 전문 회원입니다',
                }

                return (
                  <div
                    key={level}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: breadInfo.color }}
                    >
                      {breadInfo.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">
                        {breadInfo.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {descriptions[level]}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 특별 등급 (6-7) */}
          <div>
            <h3 className="text-lg font-semibold mb-3">특별 등급</h3>
            <div className="space-y-3">
              {/* 관리자 */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: BREAD_LEVELS[6].color }}
                >
                  {BREAD_LEVELS[6].emoji}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1 text-indigo-600 dark:text-indigo-400">
                    {BREAD_LEVELS[6].name} · 피크닉 관리자
                  </div>
                  <div className="text-xs text-muted-foreground">
                    커뮤니티를 관리하고 운영하는 관리자입니다
                  </div>
                </div>
              </div>

              {/* 개발자 */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: BREAD_LEVELS[7].color }}
                >
                  {BREAD_LEVELS[7].emoji}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1 text-purple-600 dark:text-purple-400">
                    {BREAD_LEVELS[7].name} · 피크닉 개발자
                  </div>
                  <div className="text-xs text-muted-foreground">
                    피크닉을 개발하고 유지보수하는 개발자입니다
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="mt-6 p-4 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <p className="mb-2">💡 <strong>브레드 등급 안내</strong></p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>등급은 활동 내역, 거래 횟수, 커뮤니티 기여도 등을 기반으로 산정됩니다</li>
              <li>일반 회원은 1-5등급까지 성장할 수 있습니다</li>
              <li>관리자와 개발자는 특별 등급이 부여됩니다</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
