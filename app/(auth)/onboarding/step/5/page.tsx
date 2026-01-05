'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function OnboardingStep5() {
  const router = useRouter()

  const breadLevels = [
    { emoji: '🍞', name: '식빵', description: '새싹 회원', range: 'Lv 1-2' },
    { emoji: '🥖', name: '바게트', description: '활동 회원', range: 'Lv 3-4' },
    { emoji: '🥐', name: '크로아상', description: '신뢰 회원', range: 'Lv 5-6' },
    { emoji: '🥨', name: '쁘레첼', description: '우수 회원', range: 'Lv 7' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center space-y-3 mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold gradient-text">picnic</h1>
          </Link>
          <p className="text-muted-foreground text-lg">
            환영합니다!
          </p>
        </div>

        <Card className="glass-strong mb-6">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center mb-4">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-3">
                모든 준비가 완료되었어요
              </h2>
              <p className="text-muted-foreground">
                활동할수록 성장하는 빵 등급 시스템을 소개합니다
              </p>
            </div>

            <div className="space-y-2">
              {breadLevels.map((level) => (
                <div
                  key={level.name}
                  className="flex items-center gap-3 p-3 rounded-lg glass"
                >
                  <div className="text-3xl">{level.emoji}</div>
                  <div className="flex-1">
                    <div className="font-medium">{level.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {level.description}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {level.range}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-4 border-t border-border/50">
              <div className="flex items-start gap-2 text-sm">
                <span>⭐</span>
                <span className="text-muted-foreground">거래 평가로 성장</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span>💬</span>
                <span className="text-muted-foreground">커뮤니티 활동 참여</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span>🎯</span>
                <span className="text-muted-foreground">높은 등급 = 높은 신뢰도</span>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
              <p className="text-sm text-primary font-medium">
                지금 바로 식빵(🍞) 등급으로 시작합니다!
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => router.push('/onboarding/complete')}
          className="w-full"
        >
          피크닉 시작하기
        </Button>
      </div>
    </div>
  )
}
