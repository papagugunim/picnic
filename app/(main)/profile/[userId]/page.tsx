'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Settings, MapPin, Calendar, Package, Train } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  MOSCOW_METRO_STATIONS,
  SPB_METRO_STATIONS,
} from '@/lib/constants'
import { getMatryoshkaInfo, getMatryoshkaDescription } from '@/lib/matryoshka'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  created_at: string
  email: string
  preferred_metro_stations: string[] | null
  matryoshka_level: number
  user_role: string | null
}

interface Post {
  id: string
  title: string
  price: number
  images: string[]
  created_at: string
  status: string
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProfileAndPosts() {
      try {
        const supabase = createClient()

        // 현재 사용자 확인
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // 본인 프로필인지 확인
        setIsOwnProfile(user.id === userId)

        // 프로필 정보 가져오기
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, city, created_at, email, preferred_metro_stations, matryoshka_level, user_role')
          .eq('id', userId)
          .single()

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          return
        }

        setProfile(profileData)

        // 사용자의 게시물 가져오기
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('id, title, price, images, created_at, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (postsError) {
          console.error('Posts fetch error:', {
            message: postsError.message,
            code: postsError.code,
            details: postsError.details,
            hint: postsError.hint,
          })
          // 에러가 있어도 빈 배열로 설정 (프로필은 계속 표시)
          setPosts([])
        } else {
          setPosts(postsData || [])
        }
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileAndPosts()
  }, [userId, router])

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
          <p className="text-muted-foreground mb-4">
            프로필을 찾을 수 없습니다
          </p>
          <Button onClick={() => router.push('/feed')}>피드로 돌아가기</Button>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
    })
  }

  const getCityLabel = (city: string | null) => {
    if (!city) return '도시 미설정'
    return city === 'moscow' ? '모스크바' : '상트페테르부르크'
  }

  const formatStationName = (label: string) => {
    const parts = label.split(' / ')
    return parts.slice(0, 2).join(' / ')
  }

  const getMetroStations = () => {
    if (!profile?.city) return []
    const stations = profile.city === 'moscow' ? MOSCOW_METRO_STATIONS : SPB_METRO_STATIONS
    return stations
  }

  const getStationInfo = (stationValue: string) => {
    const stations = getMetroStations()
    return stations.find((s) => s.value === stationValue)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 프로필 헤더 */}
      <div className="bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-8 pt-4">
        <div className="max-w-4xl mx-auto px-4">
          {/* 설정 버튼 */}
          {isOwnProfile && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => router.push('/settings')}
              >
                <Settings className="w-4 h-4" />
                설정
              </Button>
            </div>
          )}

          {/* 프로필 정보 */}
          <div className="flex items-start gap-6">
            {/* 아바타 */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || '프로필'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-gray-800 shadow-lg">
                  {profile.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold mb-2">
                {profile.full_name || '이름 없음'}
              </h1>

              {/* Matryoshka Level Badge */}
              <div className="mb-3">
                {(() => {
                  const matryoshkaInfo = getMatryoshkaInfo(
                    profile.matryoshka_level || 1,
                    profile.user_role || undefined
                  )
                  const description = getMatryoshkaDescription(
                    profile.matryoshka_level || 1,
                    profile.user_role || undefined
                  )
                  return (
                    <Link href="/about/matryoshka">
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold cursor-pointer hover:scale-105 transition-transform"
                        style={{
                          backgroundColor: matryoshkaInfo.color + '20',
                          color: matryoshkaInfo.color,
                          border: `2px solid ${matryoshkaInfo.color}`,
                        }}
                      >
                        <span className="text-base">{matryoshkaInfo.emoji}</span>
                        <span>
                          {matryoshkaInfo.name} · {description}
                        </span>
                      </div>
                    </Link>
                  )
                })()}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{getCityLabel(profile.city)}</span>
                </div>
                {profile.preferred_metro_stations &&
                  profile.preferred_metro_stations.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Train className="w-4 h-4 mt-0.5" />
                      <div className="flex flex-wrap gap-2">
                        {profile.preferred_metro_stations.map((stationValue) => {
                          const station = getStationInfo(stationValue)
                          if (!station) return null
                          return (
                            <span
                              key={stationValue}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-xs"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: station.lineColor }}
                              />
                              {formatStationName(station.label)}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(profile.created_at)} 가입</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 통계 */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold">{posts.length}</div>
              <div className="text-sm text-muted-foreground">게시물</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">리뷰</div>
            </div>
          </div>
        </div>
      </div>

      {/* 게시물 목록 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          {isOwnProfile ? '내 게시물' : '게시물'}
        </h2>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {isOwnProfile
                ? '아직 등록한 게시물이 없습니다'
                : '등록한 게시물이 없습니다'}
            </p>
            {isOwnProfile && (
              <Button onClick={() => router.push('/post/new')}>
                첫 게시물 작성하기
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="group cursor-pointer"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-2 relative">
                  {post.images && post.images.length > 0 ? (
                    <img
                      src={post.images[0]}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="w-8 h-8" />
                    </div>
                  )}
                  {post.status === 'sold' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        판매완료
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-medium line-clamp-2 mb-1">
                  {post.title}
                </h3>
                <p className="text-sm font-bold">
                  {post.price === 0
                    ? '무료나눔'
                    : `${post.price.toLocaleString()}₽`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
