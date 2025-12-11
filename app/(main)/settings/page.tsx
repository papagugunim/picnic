'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ChevronLeft, Save, Train, X, Search, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import {
  MOSCOW_METRO_STATIONS,
  SPB_METRO_STATIONS,
} from '@/lib/constants'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  preferred_metro_stations: string[] | null
}

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedStations, setSelectedStations] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function fetchProfile() {
      try {
        setIsLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, city, preferred_metro_stations')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          return
        }

        setProfile(profileData)
        setSelectedCity(profileData.city || '')
        setSelectedStations(profileData.preferred_metro_stations || [])
        setAvatarPreview(profileData.avatar_url)
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const metroStations = (selectedCity?.toLowerCase() === 'moscow' || selectedCity === 'Moscow')
    ? MOSCOW_METRO_STATIONS
    : SPB_METRO_STATIONS

  const filteredStations = useMemo(() => {
    if (!searchQuery) return metroStations
    const query = searchQuery.toLowerCase()
    return metroStations.filter((station) =>
      station.label.toLowerCase().includes(query)
    )
  }, [searchQuery, metroStations])

  const formatStationName = (label: string) => {
    const parts = label.split(' / ')
    return parts.slice(0, 2).join(' / ')
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('파일 크기는 5MB 이하여야 합니다')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    setSelectedStations([])
  }

  const handleStationToggle = (stationValue: string) => {
    if (selectedStations.includes(stationValue)) {
      setSelectedStations(selectedStations.filter((s) => s !== stationValue))
    } else {
      if (selectedStations.length < 5) {
        setSelectedStations([...selectedStations, stationValue])
      } else {
        setError('최대 5개까지 선택할 수 있습니다')
        setTimeout(() => setError(null), 2000)
      }
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인이 필요합니다')
        return
      }

      let avatarUrl = profile?.avatar_url

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = user.id + '.' + fileExt
        const filePath = 'avatars/' + fileName

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(filePath, avatarFile, { upsert: true })

        if (uploadError) {
          console.error('Avatar upload error:', uploadError)
          setError('프로필 사진 업로드 중 오류가 발생했습니다')
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(filePath)

        avatarUrl = publicUrl
      }

      const cityValue = selectedCity === 'Moscow' ? 'moscow' : 'spb'

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          city: cityValue,
          preferred_metro_stations: selectedStations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        setError('프로필 업데이트 중 오류가 발생했습니다')
        return
      }

      setSuccess('설정이 저장되었습니다!')
      setTimeout(() => {
        router.push('/profile/' + user.id)
      }, 1500)
    } catch (err) {
      console.error('Save error:', err)
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">프로필을 찾을 수 없습니다</p>
          <Button onClick={() => router.push('/feed')}>피드로 가기</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">설정</h1>
        </div>

        <div className="space-y-8">
          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">프로필 사진</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
                    {profile.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">사진 변경</p>
                <p className="text-xs text-muted-foreground">최대 5MB</p>
              </div>
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">닉네임</h2>
            <Input
              value={profile.full_name || ''}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-2">
              닉네임은 변경할 수 없습니다
            </p>
          </div>

          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">테마</h2>
            {mounted && (
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={'p-4 rounded-xl text-center transition-all ' +
                    (theme === 'light'
                      ? 'ring-4 ring-primary/50 bg-primary/10'
                      : 'bg-secondary hover:bg-muted')}
                >
                  <div className="flex justify-center mb-2">
                    <Sun className="w-8 h-8" />
                  </div>
                  <div className="font-medium text-sm">라이트</div>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={'p-4 rounded-xl text-center transition-all ' +
                    (theme === 'dark'
                      ? 'ring-4 ring-primary/50 bg-primary/10'
                      : 'bg-secondary hover:bg-muted')}
                >
                  <div className="flex justify-center mb-2">
                    <Moon className="w-8 h-8" />
                  </div>
                  <div className="font-medium text-sm">다크</div>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={'p-4 rounded-xl text-center transition-all ' +
                    (theme === 'system'
                      ? 'ring-4 ring-primary/50 bg-primary/10'
                      : 'bg-secondary hover:bg-muted')}
                >
                  <div className="flex justify-center mb-2">
                    <Monitor className="w-8 h-8" />
                  </div>
                  <div className="font-medium text-sm">시스템</div>
                </button>
              </div>
            )}
          </div>

          <div className="glass-strong rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">도시</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleCityChange('Moscow')}
                className={'p-4 rounded-xl text-center transition-all ' +
                  (selectedCity === 'Moscow' || selectedCity === 'moscow'
                    ? 'ring-4 ring-primary/50 bg-primary/10'
                    : 'bg-secondary hover:bg-muted')}
              >
                <div className="text-3xl mb-2">🏛️</div>
                <div className="font-medium">모스크바</div>
              </button>
              <button
                onClick={() => handleCityChange('Saint Petersburg')}
                className={'p-4 rounded-xl text-center transition-all ' +
                  (selectedCity === 'Saint Petersburg' || selectedCity === 'spb'
                    ? 'ring-4 ring-primary/50 bg-primary/10'
                    : 'bg-secondary hover:bg-muted')}
              >
                <div className="text-3xl mb-2">⛲</div>
                <div className="font-medium">상트페테르부르크</div>
              </button>
            </div>
          </div>

          {selectedCity && (
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                선호하는 지하철역 ({selectedStations.length}/5)
              </h2>

              {selectedStations.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedStations.map((stationValue) => {
                    const station = metroStations.find((s) => s.value === stationValue)
                    if (!station) return null
                    return (
                      <button
                        key={stationValue}
                        onClick={() => handleStationToggle(stationValue)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90"
                      >
                        {formatStationName(station.label)}
                        <X className="w-4 h-4" />
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="지하철역 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-96 overflow-y-auto space-y-1">
                {filteredStations.map((station) => {
                  const isSelected = selectedStations.includes(station.value)
                  return (
                    <button
                      key={station.value}
                      onClick={() => handleStationToggle(station.value)}
                      className={'w-full text-left px-3 py-3 rounded-lg transition-all ' +
                        (isSelected
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                          : 'hover:bg-secondary/50')}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-1 h-10 rounded-full"
                          style={{ backgroundColor: station.lineColor }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: station.lineColor }}
                            >
                              {station.line}
                            </span>
                            <span className="font-medium text-sm">
                              {formatStationName(station.label)}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-xs bg-white/20 px-2 py-1 rounded">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-14 text-base font-semibold"
          >
            {isSaving ? '저장 중...' : (
              <>
                <Save className="w-5 h-5 mr-2" />
                저장하기
              </>
            )}
          </Button>

          {success && (
            <div className="p-4 bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 rounded-lg text-sm font-medium text-center">
              {success}
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive dark:bg-destructive/20 rounded-lg text-sm font-medium text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
