'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, ChevronLeft, Loader2, Moon, Search, Sun, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useMetroStations } from '@/lib/hooks/useMetroStations'
import { getLoadingMessage } from '@/lib/loading-messages'
import { useUser } from '@/lib/contexts/UserContext'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  preferred_metro_stations: string[] | null
}

const THEME_OPTIONS = [
  {
    key: 'light',
    label: '라이트 모드',
    icon: Sun,
  },
  {
    key: 'dark',
    label: '다크 모드',
    icon: Moon,
  },
] as const

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { refreshProfile } = useUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedStations, setSelectedStations] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveButtonState, setSaveButtonState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    return () => {
      if (saveStateTimerRef.current) {
        clearTimeout(saveStateTimerRef.current)
      }
    }
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
        setUserEmail(user.email ?? null)

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

  const extractProfileImageStoragePath = (url: string | null | undefined) => {
    if (!url) return null

    try {
      const parsed = new URL(url)
      const marker = '/storage/v1/object/public/profile-images/'
      const markerIndex = parsed.pathname.indexOf(marker)
      if (markerIndex === -1) return null
      const rawPath = parsed.pathname.slice(markerIndex + marker.length)
      const decodedPath = decodeURIComponent(rawPath)
      return decodedPath || null
    } catch (err) {
      logger.warn('Failed to parse profile image URL for cleanup:', err)
      return null
    }
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
      setSaveButtonState('saving')
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인이 필요합니다')
        setSaveButtonState('idle')
        return
      }

      let avatarUrl: string | null = profile?.avatar_url ?? null
      let nextUploadedFilePath: string | null = null

      if (avatarFile) {
        // RLS 정책이 `avatars/{userId}.{ext}` 패턴을 요구하므로 user id 기반 파일명으로 고정한다.
        const normalizedExt = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase()
        const fileExt = normalizedExt.replace(/[^a-z0-9]/g, '') || 'jpg'
        const fileName = user.id + '.' + fileExt
        const filePath = 'avatars/' + fileName
        nextUploadedFilePath = filePath
        const previousAvatarPath = extractProfileImageStoragePath(profile?.avatar_url)

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(filePath, avatarFile, { upsert: true })

        if (uploadError) {
          logger.error('Avatar upload error:', uploadError)
          setError('프로필 사진 업로드 중 오류가 발생했습니다')
          setSaveButtonState('idle')
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(filePath)

        avatarUrl = publicUrl + '?v=' + Date.now()

        if (previousAvatarPath && previousAvatarPath !== filePath) {
          const { error: removeError } = await supabase.storage
            .from('profile-images')
            .remove([previousAvatarPath])
          if (removeError) {
            logger.warn('Previous avatar cleanup failed:', removeError)
          }
        }
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
        logger.error('Profile update error:', updateError)
        if (nextUploadedFilePath) {
          await supabase.storage.from('profile-images').remove([nextUploadedFilePath])
        }
        setError('프로필 업데이트 중 오류가 발생했습니다')
        setSaveButtonState('idle')
        return
      }

      if (avatarUrl) {
        setAvatarPreview(avatarUrl)
      }
      setAvatarFile(null)
      setProfile((prev) => (
        prev
          ? {
              ...prev,
              avatar_url: avatarUrl,
              city: cityValue,
              preferred_metro_stations: selectedStations,
            }
          : prev
      ))

      await refreshProfile()

      setSaveButtonState('saved')
      if (saveStateTimerRef.current) {
        clearTimeout(saveStateTimerRef.current)
      }
      saveStateTimerRef.current = setTimeout(() => {
        router.replace(`/profile/${user.id}`)
      }, 450)
    } catch (err) {
      logger.error('Save error:', err)
      setError('저장 중 오류가 발생했습니다')
      setSaveButtonState('idle')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">{getLoadingMessage('settings')}</div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">프로필을 찾을 수 없습니다</p>
            <Button onClick={() => router.push('/feed')}>피드로 가기</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">설정</h1>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-2xl mx-auto space-y-6">

          {/* 프로필 사진 */}
          <div className="flex items-center gap-4">
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
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold truncate">{profile.full_name || '익명'}</span>
                {userEmail && (
                  <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">프로필 사진 변경</div>
            </div>
          </div>

          {/* 테마 */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">테마</div>
            {mounted && (
              <div className="grid grid-cols-2 gap-2">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const active = theme === option.key
                  return (
                    <button
                      key={option.key}
                      onClick={() => setTheme(option.key)}
                      className={
                        'flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all ' +
                        (active
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-secondary hover:bg-muted')
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 도시 */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">도시</div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCityChange('Moscow')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ' +
                  (selectedCity === 'Moscow' || selectedCity === 'moscow'
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-secondary hover:bg-muted')}
              >
                <span>🏛️</span>
                <span>모스크바</span>
              </button>
              <button
                onClick={() => handleCityChange('Saint Petersburg')}
                className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ' +
                  (selectedCity === 'Saint Petersburg' || selectedCity === 'spb'
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-secondary hover:bg-muted')}
              >
                <span>⛲</span>
                <span>상트페테르부르크</span>
              </button>
            </div>
          </div>

          {/* 지하철역 */}
          {selectedCity && (
            <div>
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
          <div className="pt-1">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-11 text-sm font-semibold transition-all"
            >
              {saveButtonState === 'saving' && (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  설정 저장중
                </>
              )}
              {saveButtonState === 'saved' && (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  설정 저장 완료
                </>
              )}
              {saveButtonState === 'idle' && '설정 저장'}
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive dark:bg-destructive/20 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {/* 회원 탈퇴 */}
          <div>
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
