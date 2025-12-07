'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { MapPin, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import CitySelector from '@/components/location/CitySelector'
import { createClient } from '@/lib/supabase/client'

const locationSchema = z.object({
  city: z.string().min(1, '도시를 선택해주세요'),
  neighborhood: z.string().min(1, '지역을 선택해주세요'),
})

type LocationFormData = z.infer<typeof locationSchema>

interface LocationOnboardingProps {
  userId: string
}

export default function LocationOnboarding({ userId }: LocationOnboardingProps) {
  const router = useRouter()
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      city: '',
      neighborhood: '',
    },
  })

  // 위치 공유 요청
  async function requestLocation() {
    setIsRequestingLocation(true)

    if (!navigator.geolocation) {
      alert('브라우저에서 위치 정보를 지원하지 않습니다')
      setIsRequestingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords

        // Moscow: 55.7558° N, 37.6173° E
        // SPB: 59.9343° N, 30.3351° E

        // 간단한 거리 계산으로 가까운 도시 추천
        const moscowDistance = Math.sqrt(
          Math.pow(latitude - 55.7558, 2) + Math.pow(longitude - 37.6173, 2)
        )
        const spbDistance = Math.sqrt(
          Math.pow(latitude - 59.9343, 2) + Math.pow(longitude - 30.3351, 2)
        )

        const nearestCity = moscowDistance < spbDistance ? 'moscow' : 'spb'
        form.setValue('city', nearestCity)

        setIsRequestingLocation(false)
        alert(`위치를 감지했습니다! ${nearestCity === 'moscow' ? '모스크바' : '상트페테르부르크'}에 가까우시군요.`)
      },
      (error) => {
        console.error('Location error:', error)
        alert('위치 정보를 가져올 수 없습니다. 수동으로 선택해주세요.')
        setIsRequestingLocation(false)
      }
    )
  }

  // 프로필 업데이트 및 완료
  async function onSubmit(data: LocationFormData) {
    try {
      setIsSubmitting(true)
      const supabase = createClient()

      const { error } = await supabase
        .from('profiles')
        .update({
          city: data.city,
          neighborhood: data.neighborhood,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        console.error('Profile update error:', error)
        alert('프로필 업데이트 중 오류가 발생했습니다')
        return
      }

      // 성공하면 feed로 이동
      router.push('/feed')
      router.refresh()
    } catch (err) {
      console.error('Submit error:', err)
      alert('오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold gradient-text">picnic</h1>
        <p className="text-muted-foreground">
          거주 지역을 설정하고 시작하세요
        </p>
      </div>

      <Card className="glass-strong border-white/20">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">위치 설정</CardTitle>
          <CardDescription>
            거주하시는 도시와 지역을 선택해주세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 위치 공유 버튼 */}
          <Button
            type="button"
            variant="outline"
            className="w-full glass hover:glass-strong"
            onClick={requestLocation}
            disabled={isRequestingLocation}
          >
            {isRequestingLocation ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                위치 감지 중...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                현재 위치로 자동 설정
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                또는 수동 선택
              </span>
            </div>
          </div>

          {/* 도시/지역 선택 폼 */}
          <FormProvider {...form}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <CitySelector disabled={isSubmitting} />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    '완료'
                  )}
                </Button>
              </form>
            </Form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  )
}
