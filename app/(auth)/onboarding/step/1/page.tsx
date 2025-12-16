'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function OnboardingStep1() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center space-y-3 mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold gradient-text">picnic</h1>
          </Link>
          <p className="text-muted-foreground text-lg">
            러시아 한인 커뮤니티
          </p>
        </div>

        <Card className="glass-strong mb-6">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center mb-4">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-3">
                환영합니다!
              </h2>
              <p className="text-muted-foreground">
                모스크바와 상트페테르부르크에서 생활하는 한국인들을 위한 공간입니다
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg glass">
                <div className="text-2xl">🏠</div>
                <div>
                  <div className="font-medium">우리 동네 거래</div>
                  <div className="text-sm text-muted-foreground">
                    가까운 곳에서 안전하게 직거래
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg glass">
                <div className="text-2xl">💬</div>
                <div>
                  <div className="font-medium">실시간 채팅</div>
                  <div className="text-sm text-muted-foreground">
                    판매자와 바로 대화하고 거래
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg glass">
                <div className="text-2xl">🍞</div>
                <div>
                  <div className="font-medium">빵 등급 시스템</div>
                  <div className="text-sm text-muted-foreground">
                    활동할수록 신뢰도 상승
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => router.push('/onboarding/bread-level')}
          className="w-full mb-4"
        >
          시작하기
        </Button>

        <button
          onClick={() => router.push('/feed')}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}
