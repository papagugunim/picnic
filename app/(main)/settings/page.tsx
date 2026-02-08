'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ChevronLeft, X, Search, Sun, Moon, Monitor, AlertTriangle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useMetroStations } from '@/lib/hooks/useMetroStations'
import { getLoadingMessage } from '@/lib/loading-messages'

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
          logger.error('Profile fetch error:', profileError)
          return
        }

        setProfile(profileData)
        // Convert DB city value to display format
        const displayCity = profileData.city?.toLowerCase() === 'moscow' ? 'Moscow' : 'Saint Petersburg'
        setSelectedCity(displayCity)
        setSelectedStations(profileData.preferred_metro_stations || [])
        setAvatarPreview(profileData.avatar_url)
      } catch (err) {
        logger.error('Fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const metroStations = useMetroStations(selectedCity)

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
          logger.error('Avatar upload error:', uploadError)
          setError('프로필 사진 업로드 중 오류가 발생했습니다')
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(filePath)

        avatarUrl = publicUrl
      }

      // Convert display city value to DB format
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
        logger.error('Profile update error:', updateError)
        setError('프로필 업데이트 중 오류가 발생했습니다')
        return
      }

      setSuccess('설정이 저장되었습니다!')
      setTimeout(() => {
        router.push('/profile/' + user.id)
      }, 1500)
    } catch (err) {
      logger.error('Save error:', err)
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{getLoadingMessage('settings')}</div>
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
    <div className="bg-background">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">설정</h1>
        </div>

        <div className="space-y-3">
          {/* 프로필 */}
          <div className="flex items-center gap-4 py-3 border-b border-border">
            <div className="relative flex-shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-foreground text-xl font-bold">
                  {profile.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-3 h-3" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{profile.full_name || '익명'}</div>
              <div className="text-xs text-muted-foreground">프로필 사진 변경</div>
            </div>
          </div>

          {/* 테마 */}
          <div className="py-3 border-b border-border">
            <div className="text-sm font-medium text-muted-foreground mb-2">테마</div>
            {mounted && (
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ' +
                    (theme === 'light'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-muted')}
                >
                  <Sun className="w-4 h-4" />
                  <span>라이트</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ' +
                    (theme === 'dark'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-muted')}
                >
                  <Moon className="w-4 h-4" />
                  <span>다크</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ' +
                    (theme === 'system'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-muted')}
                >
                  <Monitor className="w-4 h-4" />
                  <span>시스템</span>
                </button>
              </div>
            )}
          </div>

          {/* 도시 */}
          <div className="py-3 border-b border-border">
            <div className="text-sm font-medium text-muted-foreground mb-2">도시</div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCityChange('Moscow')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ' +
                  (selectedCity === 'Moscow' || selectedCity === 'moscow'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-muted')}
              >
                <span>🏛️</span>
                <span>모스크바</span>
              </button>
              <button
                onClick={() => handleCityChange('Saint Petersburg')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ' +
                  (selectedCity === 'Saint Petersburg' || selectedCity === 'spb'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-muted')}
              >
                <span>⛲</span>
                <span>상트페테르부르크</span>
              </button>
            </div>
          </div>

          {/* 지하철역 */}
          {selectedCity && (
            <div className="py-3 border-b border-border">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                선호 지하철역 ({selectedStations.length}/5)
              </div>

              {selectedStations.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {selectedStations.map((stationValue) => {
                    const station = metroStations.find((s) => s.value === stationValue)
                    if (!station) return null
                    return (
                      <button
                        key={stationValue}
                        onClick={() => handleStationToggle(stationValue)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-white rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: station.lineColor }}
                      >
                        {formatStationName(station.label)}
                        <X className="w-3 h-3" />
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="지하철역 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <div className="max-h-48 overflow-y-auto">
                {filteredStations.map((station) => {
                  const isSelected = selectedStations.includes(station.value)
                  return (
                    <button
                      key={station.value}
                      onClick={() => handleStationToggle(station.value)}
                      className={'w-full text-left px-2 py-2 rounded-lg transition-all flex items-center gap-2 ' +
                        (isSelected
                          ? 'bg-primary/10'
                          : 'hover:bg-secondary/50')}
                    >
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: station.lineColor }}
                      >
                        {station.line}
                      </span>
                      <span className="text-sm truncate flex-1">
                        {formatStationName(station.label)}
                      </span>
                      {isSelected && (
                        <span className="text-primary text-sm">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-10 text-sm font-medium"
          >
            {isSaving ? '저장 중...' : '저장하기'}
          </Button>

          {success && (
            <div className="p-3 bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 rounded-lg text-sm text-center">
              {success}
            </div>
          )}

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive dark:bg-destructive/20 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {/* 회원 탈퇴 */}
          <div className="pt-4">
            <Link href="/settings/delete-account">
              <button className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors py-2">
                회원 탈퇴
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
