'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  // 지하철역 이름에서 영문 제거 (한국어 / 러시아어만)
  const formatStationName = (label: string) => {
    const parts = label.split(' / ')
    return parts.slice(0, 2).join(' / ')
  }

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
    userCity === 'moscow' ? MOSCOW_METRO_STATIONS : SPB_METRO_STATIONS

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
      // 새 역 추가 (최대 5개)
      if (selectedStations.length < 5) {
        setSelectedStations([...selectedStations, stationValue])
      } else {
        setError('최대 5개까지 선택할 수 있습니다')
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-4xl font-bold gradient-text">picnic</h1>
          <p className="text-muted-foreground">
            자주 가는 지하철역 (선택)
          </p>
        </div>

        {selectedStations.length > 0 && (
          <div className="mb-4 glass-strong rounded-lg p-4">
            <div className="text-sm font-medium mb-2">
              선택 ({selectedStations.length}/5)
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
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm hover:bg-primary/90"
                  >
                    {station ? formatStationName(station.label) : ''}
                    <X className="w-3 h-3" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="지하철역 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass pl-10"
            />
          </div>
        </div>

        <div className="mb-6 glass-strong rounded-lg p-3 max-h-[300px] overflow-y-auto">
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
                            {formatStationName(station.label)}
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

        {error && (
          <div className="mb-4 glass-strong rounded-lg p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleNext}
          className="w-full mb-4"
          disabled={isLoading}
        >
          {isLoading ? '저장 중...' : '다음'}
        </Button>

        <button
          onClick={handleSkip}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          disabled={isLoading}
        >
          건너뛰기
        </button>
      </div>
    </div>
  )
}
