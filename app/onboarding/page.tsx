'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

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
    router.push('/onboarding/step/1')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center space-y-3 mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold gradient-text">picnic</h1>
          </Link>
          <p className="text-muted-foreground text-lg">
            피크닉에 오신 것을 환영합니다
          </p>
        </div>

        <Card className="glass-strong mb-6">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">화면 테마</h2>
              <p className="text-sm text-muted-foreground">
                원하는 테마를 선택해주세요
              </p>
            </div>

            {mounted && (
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleThemeSelect('light')}
                  className={`h-auto py-6 px-3 flex flex-col items-center gap-2 rounded-lg border-2 transition-all ${
                    selectedTheme === 'light'
                      ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/50'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <Sun className="w-6 h-6" />
                  <span className="text-xs font-medium">라이트</span>
                </button>

                <button
                  onClick={() => handleThemeSelect('dark')}
                  className={`h-auto py-6 px-3 flex flex-col items-center gap-2 rounded-lg border-2 transition-all ${
                    selectedTheme === 'dark'
                      ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/50'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <Moon className="w-6 h-6" />
                  <span className="text-xs font-medium">다크</span>
                </button>

                <button
                  onClick={() => handleThemeSelect('system')}
                  className={`h-auto py-6 px-3 flex flex-col items-center gap-2 rounded-lg border-2 transition-all ${
                    selectedTheme === 'system'
                      ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary/50'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <Monitor className="w-6 h-6" />
                  <span className="text-xs font-medium">시스템</span>
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={handleContinue}
          className="w-full"
        >
          다음
        </Button>

        <button
          onClick={() => router.push('/feed')}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}
