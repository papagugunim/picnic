'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PartyPopper, MapPin, Train, Heart, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  MOSCOW_NEIGHBORHOODS,
  SPB_NEIGHBORHOODS,
  MOSCOW_METRO_STATIONS,
  SPB_METRO_STATIONS,
  CATEGORIES,
} from '@/lib/constants'

interface UserProfile {
  city: string | null
  neighborhood: string | null
  preferred_metro_stations: string[] | null
  preferred_categories: string[] | null
}

export default function OnboardingComplete() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select(
          'city, neighborhood, preferred_metro_stations, preferred_categories'
        )
        .eq('id', user.id)
        .single()

      setProfile(data)
      setIsLoading(false)
    }

    fetchProfile()
  }, [router])

  const handleStart = () => {
    router.push('/feed')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 지역명 가져오기
  const neighborhoods =
    profile?.city === 'Moscow' ? MOSCOW_NEIGHBORHOODS : SPB_NEIGHBORHOODS
  const neighborhoodLabel = neighborhoods.find(
    (n) => n.value === profile?.neighborhood
  )?.label

  // 지하철역 정보 가져오기
  const metroStations =
    profile?.city === 'Moscow' ? MOSCOW_METRO_STATIONS : SPB_METRO_STATIONS
  const selectedMetroStations = profile?.preferred_metro_stations
    ?.map((value) => metroStations.find((s) => s.value === value)?.label)
    .filter(Boolean)

  // 카테고리 정보 가져오기
  const selectedCategories = profile?.preferred_categories
    ?.map((value) => CATEGORIES.find((c) => c.value === value)?.label)
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 메인 콘텐츠 */}
        <div className="text-center mb-12">
          {/* 축하 아이콘 */}
          <div className="inline-block mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center animate-bounce">
              <PartyPopper className="w-16 h-16 text-white" />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            모든 준비가 끝났어요!
          </h1>

          <p className="text-xl text-muted-foreground mb-8">
            이제 피크닉에서 즐거운 시간을 보내세요
          </p>
        </div>

        {/* 설정 요약 */}
        <div className="space-y-4 mb-12">
          {/* 거주 지역 */}
          {profile?.city && profile?.neighborhood && (
            <div className="glass-strong rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">거주 지역</h3>
                  <p className="text-muted-foreground">
                    {profile.city === 'Moscow' ? '모스크바' : '상트페테르부르크'}
                    , {neighborhoodLabel}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 선호 지하철역 */}
          {selectedMetroStations && selectedMetroStations.length > 0 && (
            <div className="glass-strong rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Train className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">선호 지하철역</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMetroStations.map((station, index) => (
                      <span
                        key={index}
                        className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {station}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 관심 카테고리 */}
          {selectedCategories && selectedCategories.length > 0 && (
            <div className="glass-strong rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">관심 카테고리</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((category, index) => (
                      <span
                        key={index}
                        className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="glass-strong rounded-2xl p-6 mb-8">
          <p className="text-center text-sm text-muted-foreground">
            💡 모든 설정은 나중에 프로필 설정에서 변경할 수 있어요
          </p>
        </div>

        {/* 시작하기 버튼 */}
        <Button
          onClick={handleStart}
          className="w-full h-16 text-lg font-semibold"
          size="lg"
        >
          피크닉 시작하기
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
