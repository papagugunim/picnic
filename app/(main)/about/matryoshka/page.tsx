'use client'

import { ChevronLeft, Star, TrendingUp, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { MATRYOSHKA_LEVELS } from '@/lib/matryoshka'

export default function MatryoshkaInfoPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">마트료시카 등급 시스템</h1>
        </div>

        {/* Introduction */}
        <div className="bg-card rounded-xl p-3 mb-4 border border-border">
          <div className="text-center mb-3">
            <div className="text-4xl mb-2">🪆</div>
            <h2 className="text-xl font-bold mb-1">피크닉 신뢰 등급</h2>
            <p className="text-sm text-muted-foreground">
              거래를 거듭할수록 더 큰 신뢰를 쌓아가세요!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center p-2 rounded-lg">
              <Star className="w-5 h-5 text-primary mx-auto mb-1" />
              <h3 className="font-medium text-sm mb-1">거래 평가</h3>
              <p className="text-xs text-muted-foreground">1-5점</p>
            </div>

            <div className="text-center p-2 rounded-lg">
              <MessageCircle className="w-5 h-5 text-primary mx-auto mb-1" />
              <h3 className="font-medium text-sm mb-1">활동 점수</h3>
              <p className="text-xs text-muted-foreground">좋아요</p>
            </div>

            <div className="text-center p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
              <h3 className="font-medium text-sm mb-1">등급 상승</h3>
              <p className="text-xs text-muted-foreground">자동</p>
            </div>
          </div>
        </div>

        {/* Rating System */}
        <div className="bg-card rounded-xl p-3 mb-4 border border-border">
          <h2 className="text-lg font-bold mb-2">거래 평가</h2>
          <div className="space-y-1.5">
            {[
              { emoji: '🪆', count: 1, label: '별로예요', points: 10 },
              { emoji: '🪆🪆', count: 2, label: '그저 그래요', points: 20 },
              { emoji: '🪆🪆🪆', count: 3, label: '괜찮아요', points: 30 },
              { emoji: '🪆🪆🪆🪆', count: 4, label: '좋아요', points: 40 },
              { emoji: '🪆🪆🪆🪆🪆', count: 5, label: '최고예요!', points: 50 },
            ].map((item) => (
              <div key={item.count} className="flex items-center justify-between p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="text-xl">{item.emoji}</div>
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                <span className="text-sm font-bold text-primary">+{item.points}점</span>
              </div>
            ))}
          </div>
        </div>

        {/* Community Activity Score */}
        <div className="bg-card rounded-xl p-3 mb-4 border border-border">
          <h2 className="text-lg font-bold mb-2">동네 생활 활동</h2>
          <p className="text-sm text-muted-foreground mb-2">
            좋아요 1개 = 1점 (하루 최대 20점)
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 p-2 rounded-lg">
              <span className="text-lg">💬</span>
              <span className="text-sm">게시글 좋아요</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg">
              <span className="text-lg">💭</span>
              <span className="text-sm">댓글 좋아요</span>
            </div>
          </div>
        </div>

        {/* Level System */}
        <div className="bg-card rounded-xl p-3 mb-4 border border-border">
          <h2 className="text-lg font-bold mb-2">등급 안내</h2>
          <div className="space-y-1.5">
            {[1, 2, 3, 4, 5].map((level) => {
              const info = MATRYOSHKA_LEVELS[level as keyof typeof MATRYOSHKA_LEVELS]
              const scores = ['0-100', '101-300', '301-600', '601-1000', '1001+']
              return (
                <div
                  key={level}
                  className="flex items-center gap-2 p-2 rounded-lg"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{
                      backgroundColor: info.color,
                      color: 'white',
                    }}
                  >
                    {info.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm" style={{ color: info.color }}>
                      {info.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {scores[level - 1]}점
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h2 className="text-lg font-bold mb-3">💡 등급을 올리는 팁</h2>
          <ul className="space-y-2">
            {[
              '약속 시간 지키기',
              '친절하게 대화하기',
              '정확한 상품 정보 올리기',
              '빠르게 응답하기',
              '거래 후 평가 남기기',
              '유용한 동네 정보 공유하기',
            ].map((tip, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                <span className="text-primary">✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
