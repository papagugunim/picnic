'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Train, X, ChevronLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ProgressBar from '@/components/onboarding/ProgressBar'
import { createClient } from '@/lib/supabase/client'
import {
  MOSCOW_METRO_STATIONS,
  SPB_METRO_STATIONS,
} from '@/lib/constants'

export default function OnboardingStep3() {
  const router = useRouter()
  const [userCity, setUserCity] = useState<string>('')
  const [selectedStations, setSelectedStations] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 사용자의 도시 정보 가져오기
  useEffect(() => {
    async function fetchUserProfile() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('city, preferred_metro_stations')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserCity(profile.city || '')
        // 기존에 저장된 지하철역이 있으면 불러오기
        if (profile.preferred_metro_stations) {
          setSelectedStations(profile.preferred_metro_stations)
        }
      }
    }

    fetchUserProfile()
  }, [router])

  // 도시에 따른 지하철역 목록
  const metroStations =
    userCity === 'Moscow' ? MOSCOW_METRO_STATIONS : SPB_METRO_STATIONS

  // 검색 필터링
  const filteredStations = useMemo(() => {
    if (!searchQuery) return metroStations

    const query = searchQuery.toLowerCase()
    return metroStations.filter((station) =>
      station.label.toLowerCase().includes(query)
    )
  }, [searchQuery, metroStations])

  const handleStationToggle = (stationValue: string) => {
    if (selectedStations.includes(stationValue)) {
      // 이미 선택된 역 제거
      setSelectedStations(selectedStations.filter((s) => s !== stationValue))
    } else {
      // 새 역 추가 (최대 3개)
      if (selectedStations.length < 3) {
        setSelectedStations([...selectedStations, stationValue])
      } else {
        setError('최대 3개까지 선택할 수 있습니다')
        setTimeout(() => setError(null), 2000)
      }
    }
  }

  const handleNext = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인이 필요합니다')
        return
      }

      // 프로필 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preferred_metro_stations: selectedStations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        setError('프로필 업데이트 중 오류가 발생했습니다')
        return
      }

      // 다음 단계로 이동
      router.push('/onboarding/step/4')
    } catch (err) {
      console.error('Save error:', err)
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    router.push('/onboarding/step/4')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 프로그레스 바 */}
        <div className="mb-12">
          <ProgressBar currentStep={3} totalSteps={4} />
        </div>

        {/* 메인 콘텐츠 */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
              <Train className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            자주 가는 지하철역이 있나요?
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            주로 이용하는 역을 알려주시면
            <br />그 근처의 거래를 우선적으로 보여드릴게요 (선택 사항)
          </p>
        </div>

        {/* 선택된 지하철역 태그 */}
        {selectedStations.length > 0 && (
          <div className="mb-6 glass-strong rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">
                선택한 역 ({selectedStations.length}/3)
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedStations.map((stationValue) => {
                const station = metroStations.find(
                  (s) => s.value === stationValue
                )
                return (
                  <button
                    key={stationValue}
                    onClick={() => handleStationToggle(stationValue)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    {station?.label}
                    <X className="w-4 h-4" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 검색 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="지하철역 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-strong h-14 pl-12 text-base"
            />
          </div>
        </div>

        {/* 지하철역 목록 */}
        <div className="mb-8 glass-strong rounded-2xl p-4 max-h-[500px] overflow-y-auto">
          {filteredStations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              검색 결과가 없습니다
            </div>
          ) : (
            <div className="space-y-1">
              {filteredStations.map((station) => {
                const isSelected = selectedStations.includes(station.value)
                return (
                  <button
                    key={station.value}
                    onClick={() => handleStationToggle(station.value)}
                    className={`
                      w-full text-left px-3 py-3 rounded-lg
                      transition-all duration-200
                      ${
                        isSelected
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                          : 'hover:bg-secondary/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {/* 노선 색상 표시 */}
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: station.lineColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: station.lineColor }}
                          >
                            {station.line}
                          </span>
                          <span className="font-medium text-sm truncate">
                            {station.label}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-xs bg-white/20 px-2 py-1 rounded flex-shrink-0">
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-8 glass-strong rounded-lg p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* 안내 메시지 */}
        {selectedStations.length === 0 && (
          <div className="glass-strong rounded-2xl p-6 mb-8">
            <p className="text-center text-sm text-muted-foreground">
              💡 나중에 설정에서 언제든지 변경할 수 있어요
            </p>
          </div>
        )}

        {/* 버튼 그룹 */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/onboarding/step/2')}
              variant="outline"
              className="flex-1 h-14 text-base"
              disabled={isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              이전
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 h-14 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? '저장 중...' : '다음'}
            </Button>
          </div>

          {/* 건너뛰기 버튼 */}
          <button
            onClick={handleSkip}
            className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  )
}
