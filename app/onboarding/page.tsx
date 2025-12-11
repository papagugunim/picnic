'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Moon, Monitor, ChevronRight } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export default function OnboardingPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<string>('system')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && theme) {
      setSelectedTheme(theme)
    }
  }, [mounted, theme])

  const handleThemeSelect = (newTheme: string) => {
    setSelectedTheme(newTheme)
    setTheme(newTheme)
  }

  const handleContinue = () => {
    // 온보딩 완료 후 피드 페이지로 이동
    router.push('/feed')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">피크닉에 오신 것을 환영합니다! 🎉</h1>
          <p className="text-lg text-muted-foreground">
            시작하기 전에 몇 가지 설정을 해볼까요?
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-2">테마 선택</h2>
          <p className="text-muted-foreground mb-6">
            원하는 화면 테마를 선택해주세요
          </p>

          {mounted && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleThemeSelect('light')}
                className={'group p-6 rounded-2xl text-center transition-all border-2 ' +
                  (selectedTheme === 'light'
                    ? 'border-primary bg-primary/10 scale-105'
                    : 'border-border bg-secondary/50 hover:bg-secondary hover:border-primary/50')}
              >
                <div className="flex justify-center mb-4">
                  <div className={'p-4 rounded-full transition-colors ' +
                    (selectedTheme === 'light'
                      ? 'bg-primary/20'
                      : 'bg-background group-hover:bg-primary/10')}>
                    <Sun className="w-10 h-10" />
                  </div>
                </div>
                <div className="font-semibold text-lg mb-1">라이트 모드</div>
                <div className="text-sm text-muted-foreground">밝은 화면</div>
              </button>

              <button
                onClick={() => handleThemeSelect('dark')}
                className={'group p-6 rounded-2xl text-center transition-all border-2 ' +
                  (selectedTheme === 'dark'
                    ? 'border-primary bg-primary/10 scale-105'
                    : 'border-border bg-secondary/50 hover:bg-secondary hover:border-primary/50')}
              >
                <div className="flex justify-center mb-4">
                  <div className={'p-4 rounded-full transition-colors ' +
                    (selectedTheme === 'dark'
                      ? 'bg-primary/20'
                      : 'bg-background group-hover:bg-primary/10')}>
                    <Moon className="w-10 h-10" />
                  </div>
                </div>
                <div className="font-semibold text-lg mb-1">다크 모드</div>
                <div className="text-sm text-muted-foreground">어두운 화면</div>
              </button>

              <button
                onClick={() => handleThemeSelect('system')}
                className={'group p-6 rounded-2xl text-center transition-all border-2 ' +
                  (selectedTheme === 'system'
                    ? 'border-primary bg-primary/10 scale-105'
                    : 'border-border bg-secondary/50 hover:bg-secondary hover:border-primary/50')}
              >
                <div className="flex justify-center mb-4">
                  <div className={'p-4 rounded-full transition-colors ' +
                    (selectedTheme === 'system'
                      ? 'bg-primary/20'
                      : 'bg-background group-hover:bg-primary/10')}>
                    <Monitor className="w-10 h-10" />
                  </div>
                </div>
                <div className="font-semibold text-lg mb-1">시스템 설정</div>
                <div className="text-sm text-muted-foreground">자동 변경</div>
              </button>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-6 text-center">
            나중에 설정에서 언제든지 변경할 수 있습니다
          </p>
        </div>

        <Button
          onClick={handleContinue}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          시작하기
          <ChevronRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </div>
  )
}
