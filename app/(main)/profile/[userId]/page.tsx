'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Package, Users, MessageCircle, Heart, Bookmark, Flag } from 'lucide-react'
import { useMetroStations } from '@/lib/hooks/useMetroStations'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'
import Link from 'next/link'
import { BREAD_SCORE_FACTORS, getBreadDescription, getBreadEmoji, getBreadInfo, getBreadLevelByScore, getBreadScoreRange } from '@/lib/bread'
import { UserAvatar } from '@/components/ui/user-avatar'
import { getLoadingMessage } from '@/lib/loading-messages'
import { BreadLevelModal } from '@/components/bread-level-modal'
import { ReportDialog } from '@/components/admin/ReportDialog'
import {
  readProfileViewCache,
  writeProfileViewCache,
  type ProfileViewCacheData,
} from '@/lib/profile/profile-view-cache'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  created_at: string
  email: string
  preferred_metro_stations: string[] | null
  bread_level: number
  user_role: string | null
  post_count?: number | null
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

interface BreadScoreBreakdown {
  totalScore: number
  soldCount: number
  salesScore: number
  receivedReviews: number
  averageRating: number
  reviewScore: number
  communityLikesScore: number
  suggestedLevel: number
}

type ProfileTab = 'marketplace' | 'community' | 'likes' | 'interests'
type ProfileViewCachePatch = Omit<Partial<ProfileViewCacheData>, 'loadedSections'> & {
  loadedSections?: Partial<ProfileViewCacheData['loadedSections']>
}

function createBreadScoreBreakdown(
  postsData: Post[],
  reviewRatings: number[],
  communityLikesScoreRaw: number
): BreadScoreBreakdown {
  const soldCount = postsData.filter((post) => post.status === 'sold').length
  const receivedReviews = reviewRatings.length
  const averageRating = receivedReviews > 0
    ? reviewRatings.reduce((sum, rating) => sum + rating, 0) / receivedReviews
    : 0
  const communityLikesScore = Math.max(0, communityLikesScoreRaw)
  const salesScore = soldCount * BREAD_SCORE_FACTORS.completedSale
  const reviewScore = (receivedReviews * BREAD_SCORE_FACTORS.receivedReview)
    + Math.round(averageRating * BREAD_SCORE_FACTORS.reviewRatingPoint)
  const totalScore = Math.max(0, Math.round(salesScore + reviewScore + communityLikesScore))

  return {
    totalScore,
    soldCount,
    salesScore,
    receivedReviews,
    averageRating,
    reviewScore,
    communityLikesScore,
    suggestedLevel: getBreadLevelByScore(totalScore),
  }
}

function createEmptyProfileCacheData(): ProfileViewCacheData {
  return {
    profile: null,
    posts: [],
    communityPosts: [],
    likedPosts: [],
    interestedPosts: [],
    breadScoreBreakdown: null,
    loadedSections: {
      marketplace: false,
      community: false,
      likes: false,
      interests: false,
    },
  }
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const { user: contextUser } = useUser()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [interestedPosts, setInterestedPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState<ProfileTab>('marketplace')
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadedSections, setLoadedSections] = useState<Record<ProfileTab, boolean>>({
    marketplace: false,
    community: false,
    likes: false,
    interests: false,
  })
  const [loadingSections, setLoadingSections] = useState<Record<ProfileTab, boolean>>({
    marketplace: false,
    community: false,
    likes: false,
    interests: false,
  })
  const [isStartingChat, setIsStartingChat] = useState(false)
  const [isBreadModalOpen, setIsBreadModalOpen] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [breadScoreBreakdown, setBreadScoreBreakdown] = useState<BreadScoreBreakdown | null>(null)
  const cacheSnapshotRef = useRef<ProfileViewCacheData>(createEmptyProfileCacheData())
  const metroStations = useMetroStations(profile?.city)

  const updateSectionLoading = useCallback((section: ProfileTab, nextValue: boolean) => {
    setLoadingSections((prev) => ({ ...prev, [section]: nextValue }))
  }, [])

  const updateSectionLoaded = useCallback((section: ProfileTab, nextValue: boolean) => {
    setLoadedSections((prev) => ({ ...prev, [section]: nextValue }))
  }, [])

  const persistCache = useCallback((patch: ProfileViewCachePatch) => {
    const previous = cacheSnapshotRef.current || createEmptyProfileCacheData()
    const next: ProfileViewCacheData = {
      ...previous,
      ...patch,
      loadedSections: {
        ...previous.loadedSections,
        ...(patch.loadedSections || {}),
      },
    }

    cacheSnapshotRef.current = next
    writeProfileViewCache(userId, next)
  }, [userId])

  const loadCommunityPosts = useCallback(async () => {
    if (loadedSections.community || loadingSections.community) return

    updateSectionLoading('community', true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('community_posts')
        .select('id, title, content, images, category, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Community posts fetch error:', error)
        setCommunityPosts([])
      } else {
        const nextItems = (data || []) as CommunityPost[]
        setCommunityPosts(nextItems)
        persistCache({
          communityPosts: nextItems,
          loadedSections: { community: true },
        })
      }
    } catch (error) {
      logger.error('Community posts fetch exception:', error)
    } finally {
      updateSectionLoaded('community', true)
      updateSectionLoading('community', false)
    }
  }, [loadedSections.community, loadingSections.community, persistCache, updateSectionLoaded, updateSectionLoading, userId])

  const loadLikedPosts = useCallback(async () => {
    if (!isOwnProfile || loadedSections.likes || loadingSections.likes) return

    updateSectionLoading('likes', true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
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

      if (error) {
        logger.error('Liked posts fetch error:', error)
        setLikedPosts([])
      } else {
        const nextItems = (data?.map((item: any) => item.posts).filter(Boolean) || []) as Post[]
        setLikedPosts(nextItems)
        persistCache({
          likedPosts: nextItems,
          loadedSections: { likes: true },
        })
      }
    } catch (error) {
      logger.error('Liked posts fetch exception:', error)
    } finally {
      updateSectionLoaded('likes', true)
      updateSectionLoading('likes', false)
    }
  }, [isOwnProfile, loadedSections.likes, loadingSections.likes, persistCache, updateSectionLoaded, updateSectionLoading, userId])

  const loadInterestedPosts = useCallback(async () => {
    if (!isOwnProfile || loadedSections.interests || loadingSections.interests) return

    updateSectionLoading('interests', true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
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

      if (error) {
        logger.error('Interested posts fetch error:', error)
        setInterestedPosts([])
      } else {
        const nextItems = (data?.map((item: any) => item.posts).filter(Boolean) || []) as Post[]
        setInterestedPosts(nextItems)
        persistCache({
          interestedPosts: nextItems,
          loadedSections: { interests: true },
        })
      }
    } catch (error) {
      logger.error('Interested posts fetch exception:', error)
    } finally {
      updateSectionLoaded('interests', true)
      updateSectionLoading('interests', false)
    }
  }, [isOwnProfile, loadedSections.interests, loadingSections.interests, persistCache, updateSectionLoaded, updateSectionLoading, userId])

  useEffect(() => {
    let cancelled = false

    async function bootstrapProfile() {
      try {
        const supabase = createClient()
        const sessionUserId = contextUser?.id
          || (await supabase.auth.getUser()).data.user?.id

        if (!sessionUserId) {
          router.push('/login')
          return
        }

        const ownProfile = sessionUserId === userId
        if (cancelled) return

        setIsOwnProfile(ownProfile)
        setIsLoading(true)
        setLoadingSections({
          marketplace: false,
          community: false,
          likes: false,
          interests: false,
        })

        const cached = readProfileViewCache(userId)
        if (cached) {
          cacheSnapshotRef.current = cached
          setProfile(cached.profile as Profile | null)
          setPosts((cached.posts || []) as Post[])
          setCommunityPosts((cached.communityPosts || []) as CommunityPost[])
          setLikedPosts((cached.likedPosts || []) as Post[])
          setInterestedPosts((cached.interestedPosts || []) as Post[])
          setBreadScoreBreakdown((cached.breadScoreBreakdown as BreadScoreBreakdown | null) || null)
          setLoadedSections({
            marketplace: true,
            community: !!cached.loadedSections.community,
            likes: ownProfile ? !!cached.loadedSections.likes : false,
            interests: ownProfile ? !!cached.loadedSections.interests : false,
          })
          setIsLoading(false)
        } else {
          cacheSnapshotRef.current = createEmptyProfileCacheData()
          setLoadedSections({
            marketplace: false,
            community: false,
            likes: false,
            interests: false,
          })
        }

        updateSectionLoading('marketplace', true)
        const [profileResult, postsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url, city, created_at, email, preferred_metro_stations, bread_level, user_role, post_count')
            .eq('id', userId)
            .single(),
          supabase
            .from('posts')
            .select('id, title, price, images, created_at, status')
            .eq('author_id', userId)
            .order('created_at', { ascending: false }),
        ])

        if (cancelled) return

        if (profileResult.error || !profileResult.data) {
          logger.error('Profile fetch error:', profileResult.error)
          setIsLoading(false)
          return
        }

        if (postsResult.error) {
          logger.error('Posts fetch error:', {
            message: postsResult.error.message,
            code: postsResult.error.code,
            details: postsResult.error.details,
            hint: postsResult.error.hint,
          })
        }

        const nextProfile = profileResult.data as Profile
        const nextPosts = ((postsResult.data || []) as Post[])
        const previousCache = cacheSnapshotRef.current || createEmptyProfileCacheData()

        setProfile(nextProfile)
        setPosts(nextPosts)
        setIsLoading(false)
        updateSectionLoaded('marketplace', true)
        setBreadScoreBreakdown(previousCache.breadScoreBreakdown as BreadScoreBreakdown | null)

        persistCache({
          profile: nextProfile,
          posts: nextPosts,
          communityPosts: previousCache.communityPosts,
          likedPosts: previousCache.likedPosts,
          interestedPosts: previousCache.interestedPosts,
          breadScoreBreakdown: previousCache.breadScoreBreakdown,
          loadedSections: {
            marketplace: true,
            community: previousCache.loadedSections.community,
            likes: ownProfile ? previousCache.loadedSections.likes : false,
            interests: ownProfile ? previousCache.loadedSections.interests : false,
          },
        })

        void (async () => {
          try {
            const [reviewResult, communityScoreResult] = await Promise.all([
              supabase
                .from('reviews')
                .select('rating')
                .eq('reviewee_id', userId),
              supabase.rpc('calculate_community_score', { p_user_id: userId }),
            ])

            if (cancelled) return

            if (reviewResult.error) {
              logger.warn('Bread review score fetch error:', reviewResult.error)
            }

            if (communityScoreResult.error) {
              logger.warn('Bread community score fetch error:', communityScoreResult.error)
            }

            const reviewRatings = (reviewResult.data || []).map((review) => Number(review.rating) || 0)
            const communityLikesScore = typeof communityScoreResult.data === 'number'
              ? communityScoreResult.data
              : 0
            const nextBreadScore = createBreadScoreBreakdown(nextPosts, reviewRatings, communityLikesScore)

            setBreadScoreBreakdown(nextBreadScore)
            persistCache({
              breadScoreBreakdown: nextBreadScore,
            })
          } catch (scoreError) {
            if (!cancelled) {
              logger.warn('Bread score background fetch exception:', scoreError)
            }
          }
        })()
      } catch (error) {
        if (!cancelled) {
          logger.error('Profile bootstrap error:', error)
          setIsLoading(false)
        }
      } finally {
        if (!cancelled) {
          updateSectionLoading('marketplace', false)
        }
      }
    }

    void bootstrapProfile()

    return () => {
      cancelled = true
    }
  }, [contextUser?.id, persistCache, router, updateSectionLoaded, updateSectionLoading, userId])

  useEffect(() => {
    if (activeTab === 'community' && !loadedSections.community && !loadingSections.community) {
      void loadCommunityPosts()
      return
    }

    if (activeTab === 'likes' && isOwnProfile && !loadedSections.likes && !loadingSections.likes) {
      void loadLikedPosts()
      return
    }

    if (activeTab === 'interests' && isOwnProfile && !loadedSections.interests && !loadingSections.interests) {
      void loadInterestedPosts()
    }
  }, [
    activeTab,
    isOwnProfile,
    loadedSections.community,
    loadedSections.likes,
    loadedSections.interests,
    loadingSections.community,
    loadingSections.likes,
    loadingSections.interests,
    loadCommunityPosts,
    loadLikedPosts,
    loadInterestedPosts,
  ])

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
        logger.error('Chat room creation error:', error)
        return
      }

      // Navigate to chat room
      router.push(`/chats/${data}`)
    } catch (err) {
      logger.error('Start chat error:', err)
    } finally {
      setIsStartingChat(false)
    }
  }

  function requestLogout() {
    setShowLogoutConfirm(true)
  }

  async function confirmLogout() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (err) {
      logger.error('Logout error:', err)
    } finally {
      setShowLogoutConfirm(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{getLoadingMessage('profile')}</div>
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

  const getStationInfo = (stationValue: string) => {
    return metroStations.find((s) => s.value === stationValue)
  }

  const tabCountLabel = (tab: ProfileTab, count: number) => {
    if (!loadedSections[tab]) {
      return '...'
    }
    return String(count)
  }

  return (
    <div className="bg-background">
      {/* 프로필 헤더 */}
      <div className="pb-4 pt-2">
        <div className="max-w-4xl mx-auto px-4">

          {/* 프로필 정보 */}
          <div className="flex items-start gap-4">
            {/* 아바타 */}
            <div className="flex-shrink-0">
              <UserAvatar
                src={profile.avatar_url}
                alt={profile.full_name || '프로필'}
                breadLevel={profile.bread_level || 1}
                size="xl"
              />
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold truncate">
                  {profile.full_name || '이름 없음'}
                </h1>
                <div className="flex flex-col items-end text-xs text-muted-foreground flex-shrink-0 ml-2 gap-0.5">
                  <span>가입일 : {formatDate(profile.created_at)}</span>
                  <span>📍 {getCityLabel(profile.city)}</span>
                </div>
              </div>

              {/* Bread Level Badge */}
              <div className="mb-2">
                {(() => {
                  const breadInfo = getBreadInfo(
                    profile.bread_level || 1,
                    profile.user_role || undefined
                  )
                  const description = getBreadDescription(
                    profile.bread_level || 1,
                    profile.user_role || undefined
                  )
                  const emoji = getBreadEmoji(
                    profile.bread_level || 1,
                    profile.user_role || undefined
                  )
                  return (
                    <button
                      onClick={() => setIsBreadModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer"
                      style={{
                        backgroundColor: breadInfo.color,
                      }}
                    >
                      <div className="w-4 h-4 flex items-center justify-center text-sm">
                        {emoji}
                      </div>
                      <span
                        style={{
                          color: profile.user_role === 'developer' || profile.user_role === 'admin'
                            ? '#FFFFFF'
                            : '#1F2937'
                        }}
                      >
                        {breadInfo.name} · {description}
                      </span>
                    </button>
                  )
                })()}
                {breadScoreBreakdown && profile.user_role !== 'admin' && profile.user_role !== 'developer' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    브레드 점수 {breadScoreBreakdown.totalScore.toLocaleString()}점 · 현재 구간 {getBreadScoreRange(profile.bread_level || 1)}
                  </p>
                )}
              </div>

              {/* 지하철역 */}
              {profile.preferred_metro_stations && profile.preferred_metro_stations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {profile.preferred_metro_stations.map((stationValue) => {
                    const station = getStationInfo(stationValue)
                    if (!station) return null
                    return (
                      <span
                        key={stationValue}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: `${station.lineColor}20`,
                          border: `1px solid ${station.lineColor}`,
                          color: station.lineColor
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: station.lineColor }}
                        />
                        {formatStationName(station.label)}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* 채팅하기/신고 버튼 (다른 사람 프로필일 경우만) */}
              {!isOwnProfile && (
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5"
                    onClick={startChat}
                    disabled={isStartingChat}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="text-xs">{isStartingChat ? '로딩중' : '채팅'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setIsReportDialogOpen(true)}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span className="text-xs">신고</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div>
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
              중고거래 ({tabCountLabel('marketplace', posts.length)})
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
              동네생활 ({tabCountLabel('community', communityPosts.length)})
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
                  좋아요 ({tabCountLabel('likes', likedPosts.length)})
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
                  관심 ({tabCountLabel('interests', interestedPosts.length)})
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 게시물 목록 */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'likes' ? (
          <>
            {loadingSections.likes && !loadedSections.likes ? (
              <div className="text-center py-16 text-muted-foreground">
                좋아요 게시글을 불러오는 중입니다...
              </div>
            ) : likedPosts.length === 0 ? (
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
                      {post.status === 'reserved' && (
                        <div className="absolute inset-0 bg-orange-900/60 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            예약중
                          </span>
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
            {loadingSections.interests && !loadedSections.interests ? (
              <div className="text-center py-16 text-muted-foreground">
                관심 게시글을 불러오는 중입니다...
              </div>
            ) : interestedPosts.length === 0 ? (
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
                      {post.status === 'reserved' && (
                        <div className="absolute inset-0 bg-orange-900/60 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            예약중
                          </span>
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
        {loadingSections.marketplace && !loadedSections.marketplace ? (
          <div className="text-center py-16 text-muted-foreground">
            중고거래 게시글을 불러오는 중입니다...
          </div>
        ) : posts.length === 0 ? (
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
            {loadingSections.community && !loadedSections.community ? (
              <div className="text-center py-16 text-muted-foreground">
                동네생활 게시글을 불러오는 중입니다...
              </div>
            ) : communityPosts.length === 0 ? (
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
            onClick={requestLogout}
            className="w-full py-4 text-center text-muted-foreground hover:text-destructive transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}

      {/* 브레드 등급 설명 모달 */}
      <BreadLevelModal
        open={isBreadModalOpen}
        onOpenChange={setIsBreadModalOpen}
        currentLevel={profile.bread_level || 1}
        currentRole={profile.user_role}
        currentScore={breadScoreBreakdown?.totalScore || 0}
        scoreBreakdown={breadScoreBreakdown}
      />

      {/* 신고 다이얼로그 */}
      <ReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        targetType="user"
        targetId={userId}
      />

      {/* 로그아웃 확인 다이얼로그 */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>로그아웃</AlertDialogTitle>
            <AlertDialogDescription>
              로그아웃 하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout}>
              로그아웃
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
