'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Settings, MapPin, Calendar, Package, Train, Users, MessageCircle, Heart, Bookmark } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  MOSCOW_METRO_STATIONS,
  SPB_METRO_STATIONS,
} from '@/lib/constants'
import { getMatryoshkaInfo, getMatryoshkaDescription } from '@/lib/matryoshka'
import { getRandomLoadingMessage } from '@/lib/loading-messages'

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

interface CommunityPost {
  id: string
  title: string
  content: string
  images: string[] | null
  category: string
  created_at: string
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const { theme, resolvedTheme } = useTheme()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [interestedPosts, setInterestedPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState<'marketplace' | 'community' | 'likes' | 'interests'>('marketplace')
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isStartingChat, setIsStartingChat] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

        // 사용자의 중고거래 게시물 가져오기
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('id, title, price, images, created_at, status')
          .eq('author_id', userId)
          .order('created_at', { ascending: false })

        if (postsError) {
          console.error('Posts fetch error:', {
            message: postsError.message,
            code: postsError.code,
            details: postsError.details,
            hint: postsError.hint,
          })
          setPosts([])
        } else {
          setPosts(postsData || [])
        }

        // 사용자의 동네생활 게시물 가져오기
        const { data: communityPostsData, error: communityPostsError } = await supabase
          .from('community_posts')
          .select('id, title, content, images, category, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (communityPostsError) {
          console.error('Community posts fetch error:', communityPostsError)
          setCommunityPosts([])
        } else {
          setCommunityPosts(communityPostsData || [])
        }

        // 본인 프로필일 경우 좋아요/관심 게시글 가져오기
        if (user.id === userId) {
          // 좋아요한 게시글 가져오기
          const { data: likedPostsData, error: likedPostsError } = await supabase
            .from('post_likes')
            .select(`
              post_id,
              posts:post_id (
                id,
                title,
                price,
                images,
                created_at,
                status
              )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

          if (likedPostsError) {
            console.error('Liked posts fetch error:', likedPostsError)
            setLikedPosts([])
          } else {
            const liked = likedPostsData?.map((item: any) => item.posts).filter(Boolean) || []
            setLikedPosts(liked)
          }

          // 관심 있는 게시글 가져오기
          const { data: interestedPostsData, error: interestedPostsError } = await supabase
            .from('post_interests')
            .select(`
              post_id,
              posts:post_id (
                id,
                title,
                price,
                images,
                created_at,
                status
              )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

          if (interestedPostsError) {
            console.error('Interested posts fetch error:', interestedPostsError)
            setInterestedPosts([])
          } else {
            const interested = interestedPostsData?.map((item: any) => item.posts).filter(Boolean) || []
            setInterestedPosts(interested)
          }
        }
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileAndPosts()
  }, [userId, router])

  async function startChat() {
    try {
      setIsStartingChat(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Call the database function to get or create chat room
      const { data, error } = await supabase.rpc('get_or_create_chat_room', {
        p_user1_id: user.id,
        p_user2_id: userId,
      })

      if (error) {
        console.error('Chat room creation error:', error)
        return
      }

      // Navigate to chat room
      router.push(`/chats/${data}`)
    } catch (err) {
      console.error('Start chat error:', err)
    } finally {
      setIsStartingChat(false)
    }
  }

  async function handleLogout() {
    if (!confirm('로그아웃 하시겠습니까?')) return

    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{getRandomLoadingMessage()}</div>
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

  const isDark = mounted && (resolvedTheme === 'dark' || (!resolvedTheme && theme === 'dark'))

  return (
    <div className="min-h-screen bg-background">
      {/* 프로필 헤더 */}
      <div className="pb-8 pt-4 bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4">
          {/* 설정 버튼 또는 채팅하기 버튼 */}
          <div className="flex justify-end mb-4">
            {isOwnProfile ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => router.push('/settings')}
              >
                <Settings className="w-4 h-4" />
                설정
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={startChat}
                disabled={isStartingChat}
              >
                <MessageCircle className="w-4 h-4" />
                {isStartingChat ? getRandomLoadingMessage() : '채팅하기'}
              </Button>
            )}
          </div>

          {/* 프로필 정보 */}
          <div className="flex items-start gap-6">
            {/* 아바타 */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || '프로필'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-border shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-border shadow-lg">
                  {profile.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                <h1 className="text-3xl font-bold">
                  {profile.full_name || '이름 없음'}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(profile.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{getCityLabel(profile.city)}</span>
                  </div>
                </div>
              </div>

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
                          border: `2px solid ${matryoshkaInfo.color}`,
                        }}
                      >
                        <div
                          className="w-5 h-5 flex items-center justify-center text-base"
                        >
                          {/* Use emoji based on level */}
                          {profile.user_role === 'developer' ? '🍔' :
                           profile.user_role === 'admin' ? '🥪' :
                           profile.matryoshka_level === 5 ? '🥯' :
                           profile.matryoshka_level === 4 ? '🥨' :
                           profile.matryoshka_level === 3 ? '🥐' :
                           profile.matryoshka_level === 2 ? '🥖' : '🍞'}
                        </div>
                        <span className="text-foreground">
                          {matryoshkaInfo.name} · {description}
                        </span>
                      </div>
                    </Link>
                  )
                })()}
              </div>

              <div className="flex items-start gap-2">
                <Train className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex flex-wrap gap-2">
                  {profile.preferred_metro_stations && profile.preferred_metro_stations.length > 0 ? (
                    profile.preferred_metro_stations.map((stationValue) => {
                      const station = getStationInfo(stationValue)
                      if (!station) return null
                      return (
                        <span
                          key={stationValue}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                          style={{
                            backgroundColor: `${station.lineColor}20`,
                            border: `1px solid ${station.lineColor}`,
                            color: station.lineColor
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: station.lineColor }}
                          />
                          {formatStationName(station.label)}
                        </span>
                      )
                    })
                  ) : (
                    <span className="text-muted-foreground text-xs">설정 안 함</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 통계 */}
      <div>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold">{posts.length + communityPosts.length}</div>
              <div className="text-sm text-muted-foreground">전체 게시물</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{posts.length}</div>
              <div className="text-sm text-muted-foreground">중고거래</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{communityPosts.length}</div>
              <div className="text-sm text-muted-foreground">동네생활</div>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex items-center gap-2 px-4 py-3 transition-colors whitespace-nowrap ${
                activeTab === 'marketplace'
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="w-5 h-5" />
              중고거래 ({posts.length})
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`flex items-center gap-2 px-4 py-3 transition-colors whitespace-nowrap ${
                activeTab === 'community'
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-5 h-5" />
              동네생활 ({communityPosts.length})
            </button>
            {isOwnProfile && (
              <>
                <button
                  onClick={() => setActiveTab('likes')}
                  className={`flex items-center gap-2 px-4 py-3 transition-colors whitespace-nowrap ${
                    activeTab === 'likes'
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Heart className="w-5 h-5" />
                  좋아요 ({likedPosts.length})
                </button>
                <button
                  onClick={() => setActiveTab('interests')}
                  className={`flex items-center gap-2 px-4 py-3 transition-colors whitespace-nowrap ${
                    activeTab === 'interests'
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Bookmark className="w-5 h-5" />
                  관심 ({interestedPosts.length})
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 게시물 목록 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'likes' ? (
          <>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              좋아요한 게시글
            </h2>

            {likedPosts.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  아직 좋아요한 게시글이 없습니다
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {likedPosts.map((post) => (
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
                      {post.price === 0 || post.price === null
                        ? '무료나눔'
                        : `${post.price.toLocaleString()}₽`}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : activeTab === 'interests' ? (
          <>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Bookmark className="w-5 h-5" />
              관심 있는 거래
            </h2>

            {interestedPosts.length === 0 ? (
              <div className="text-center py-16">
                <Bookmark className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  아직 관심 표시한 거래가 없습니다
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {interestedPosts.map((post) => (
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
                      {post.price === 0 || post.price === null
                        ? '무료나눔'
                        : `${post.price.toLocaleString()}₽`}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : activeTab === 'marketplace' ? (
          <>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              {isOwnProfile ? '내 중고거래' : '중고거래'}
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
                  {post.price === 0 || post.price === null
                    ? '무료나눔'
                    : `${post.price.toLocaleString()}₽`}
                </p>
              </Link>
            ))}
          </div>
        )}
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {isOwnProfile ? '내 동네생활' : '동네생활'}
            </h2>

            {communityPosts.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {isOwnProfile
                    ? '아직 작성한 동네생활 게시글이 없습니다'
                    : '작성한 동네생활 게시글이 없습니다'}
                </p>
                {isOwnProfile && (
                  <Button onClick={() => router.push('/community/new')}>
                    첫 동네생활 게시글 작성하기
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {communityPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="block bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                    <p className="text-muted-foreground line-clamp-2 mb-3">
                      {post.content}
                    </p>
                    {post.images && post.images.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {post.images.slice(0, 3).map((image, idx) => (
                          <img
                            key={idx}
                            src={image}
                            alt={`이미지 ${idx + 1}`}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        ))}
                        {post.images.length > 3 && (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
                            +{post.images.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 로그아웃 버튼 */}
      {isOwnProfile && (
        <div className="max-w-4xl mx-auto px-4 pb-24">
          <button
            onClick={handleLogout}
            className="w-full py-4 text-center text-muted-foreground hover:text-destructive transition-colors border-t border-border"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
