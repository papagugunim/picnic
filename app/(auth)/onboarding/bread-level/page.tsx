'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MATRYOSHKA_LEVELS } from '@/lib/matryoshka'

export default function BreadLevelOnboarding() {
  const router = useRouter()

  const breadLevels = [
    { level: 1, emoji: '🍞', name: '식빵', description: '새싹 회원' },
    { level: 2, emoji: '🥖', name: '바게트', description: '활동 회원' },
    { level: 3, emoji: '🥐', name: '크로아상', description: '신뢰 회원' },
    { level: 4, emoji: '🥨', name: '쁘레첼', description: '우수 회원' },
    { level: 5, emoji: '🥯', name: '베이글', description: '전문 회원' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 메인 콘텐츠 */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            빵 등급 시스템 🍞
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            활동할수록 더 맛있는 빵으로 성장하세요!
            <br />
            거래 평가와 동네생활 활동으로 등급이 올라갑니다
          </p>
        </div>

        {/* 빵 등급 카드 */}
        <div className="glass-strong rounded-2xl p-6 mb-8">
          <div className="space-y-3">
            {breadLevels.map((level) => {
              const info = MATRYOSHKA_LEVELS[level.level as keyof typeof MATRYOSHKA_LEVELS]
              return (
                <div
                  key={level.level}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      backgroundColor: info.color,
                    }}
                  >
                    {level.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">
                      {level.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {level.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="glass-strong rounded-2xl p-6 mb-8">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">⭐</div>
              <div>
                <div className="font-medium mb-1">거래 평가로 성장</div>
                <div className="text-sm text-muted-foreground">
                  거래 후 받은 별점이 높을수록 빠르게 성장해요
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">💬</div>
              <div>
                <div className="font-medium mb-1">동네생활 활동</div>
                <div className="text-sm text-muted-foreground">
                  게시글과 댓글에 좋아요를 받으면 점수가 올라가요
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">🎯</div>
              <div>
                <div className="font-medium mb-1">신뢰도 표시</div>
                <div className="text-sm text-muted-foreground">
                  등급이 높을수록 다른 사용자들에게 신뢰를 줄 수 있어요
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA 버튼 */}
        <Button
          onClick={() => router.push('/onboarding/step/2')}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          <span>다음</span>
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>

        {/* 건너뛰기 버튼 */}
        <button
          onClick={() => router.push('/onboarding/step/2')}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}
