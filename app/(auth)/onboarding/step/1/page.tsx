'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, Users, MapPin, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ProgressBar from '@/components/onboarding/ProgressBar'

export default function OnboardingStep1() {
  const router = useRouter()

  const features = [
    {
      icon: Users,
      title: '한인 커뮤니티',
      description: '러시아에서 활동하는 한국인들과 함께해요',
    },
    {
      icon: MapPin,
      title: '우리 동네 거래',
      description: '가까운 곳에서 안전하게 직거래',
    },
    {
      icon: MessageCircle,
      title: '실시간 채팅',
      description: '판매자와 바로 대화하고 거래해요',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 프로그레스 바 */}
        <div className="mb-12">
          <ProgressBar currentStep={1} totalSteps={4} />
        </div>

        {/* 메인 콘텐츠 */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            러시아에서의 새로운 시작,
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
              피크닉과 함께해요! 🌸
            </span>
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            모스크바와 상트페테르부르크에서 생활하는
            <br />
            한국인들을 위한 특별한 공간이에요
          </p>
        </div>

        {/* 특징 카드 */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="glass-strong rounded-2xl p-6 text-center hover:scale-105 transition-transform"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* 안내 메시지 */}
        <div className="glass-strong rounded-2xl p-6 mb-8">
          <p className="text-center text-sm text-muted-foreground mb-4">
            ✨ 프로필을 완성하고 피크닉을 시작해볼까요?
            <br />
            몇 가지 질문으로 여러분에게 꼭 맞는 경험을 준비할게요!
          </p>
        </div>

        {/* CTA 버튼 */}
        <Button
          onClick={() => router.push('/onboarding/bread-level')}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          시작하기 ✨
        </Button>

        {/* 건너뛰기 버튼 */}
        <button
          onClick={() => router.push('/feed')}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          나중에 하기
        </button>
      </div>
    </div>
  )
}
