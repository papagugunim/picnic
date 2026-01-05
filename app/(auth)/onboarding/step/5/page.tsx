'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function OnboardingStep5() {
  const router = useRouter()

  const regularLevels = [
    { emoji: '🍞', name: '식빵', description: '피크닉을 처음 시작한 회원입니다', subtitle: '새싹 회원' },
    { emoji: '🥖', name: '바게트', description: '꾸준히 활동하는 회원입니다', subtitle: '활동 회원' },
    { emoji: '🥐', name: '크로아상', description: '신뢰할 수 있는 거래 내역을 쌓은 회원입니다', subtitle: '신뢰 회원' },
    { emoji: '🥨', name: '쁘레첼', description: '커뮤니티에서 활발히 활동하는 우수 회원입니다', subtitle: '우수 회원' },
    { emoji: '🥯', name: '베이글', description: '많은 경험과 신뢰를 쌓은 전문 회원입니다', subtitle: '전문 회원' },
  ]

  const specialLevels = [
    { emoji: '🥪', name: '샌드위치', description: '커뮤니티를 관리하고 운영하는 관리자입니다', subtitle: '피크닉 관리자' },
    { emoji: '🍔', name: '햄버거', description: '피크닉을 개발하고 유지보수하는 개발자입니다', subtitle: '피크닉 개발자' },
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
                활동할수록 성장하는 브레드 등급 시스템을 소개합니다
              </p>
            </div>

            {/* 일반 회원 등급 */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">일반 회원 등급</h3>
              <div className="space-y-2">
                {regularLevels.map((level) => (
                  <div
                    key={level.name}
                    className="flex items-start gap-3 p-3 rounded-lg glass"
                  >
                    <div className="text-2xl flex-shrink-0">{level.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold">{level.name}</span>
                        <span className="text-xs text-muted-foreground">· {level.subtitle}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {level.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 특별 등급 */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">특별 등급</h3>
              <div className="space-y-2">
                {specialLevels.map((level) => (
                  <div
                    key={level.name}
                    className="flex items-start gap-3 p-3 rounded-lg glass bg-primary/5 border border-primary/20"
                  >
                    <div className="text-2xl flex-shrink-0">{level.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold">{level.name}</span>
                        <span className="text-xs text-primary">· {level.subtitle}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {level.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 안내사항 */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <span>💡</span>
                <div className="flex-1 text-muted-foreground">
                  <p className="font-medium mb-1">브레드 등급 안내</p>
                  <ul className="space-y-1">
                    <li>• 등급은 활동 내역, 거래 횟수, 커뮤니티 기여도 등을 기반으로 산정됩니다</li>
                    <li>• 일반 회원은 1-5등급까지 성장할 수 있습니다</li>
                    <li>• 관리자와 개발자는 특별 등급이 부여됩니다</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
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
