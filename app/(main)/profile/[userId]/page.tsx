'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Package, Users, Bookmark, Star } from 'lucide-react'
import { useMetroStations } from '@/lib/hooks/useMetroStations'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'
import Link from 'next/link'
import { BREAD_SCORE_FACTORS, getBreadDescription, getBreadEmoji, getBreadInfo, getBreadLevelByScore } from '@/lib/bread'
import { UserAvatar } from '@/components/ui/user-avatar'
import { getLoadingMessage } from '@/lib/loading-messages'
import { BreadLevelModal } from '@/components/bread-level-modal'
import { MilkPointModal } from '@/components/milk-point-modal'
import { toast } from 'sonner'
import {
  readProfileViewCache,
  writeProfileViewCache,
  type ProfileViewCacheData,
  type ProfileViewCachedReceivedReview,
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

interface ReceivedReview {
  id: string
  post_id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  post: {
    id: string
    title: string
  } | null
}

interface RawReceivedReview {
  id: string
  post_id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer:
    | {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
    | {
      id: string
      full_name: string | null
      avatar_url: string | null
    }[]
    | null
  post:
    | {
      id: string
      title: string
    }
    | {
      id: string
      title: string
    }[]
    | null
}

type ProfileTab = 'marketplace' | 'community' | 'interests'
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
    receivedReviews: [],
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
  const [interestedPosts, setInterestedPosts] = useState<Post[]>([])
  const [communityPostCount, setCommunityPostCount] = useState<number | null>(null)
  const [interestedPostCount, setInterestedPostCount] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('marketplace')
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadedSections, setLoadedSections] = useState<Record<ProfileTab, boolean>>({
    marketplace: false,
    community: false,
    interests: false,
  })
  const [loadingSections, setLoadingSections] = useState<Record<ProfileTab, boolean>>({
    marketplace: false,
    community: false,
    interests: false,
  })
  const [isBreadModalOpen, setIsBreadModalOpen] = useState(false)
  const [isMilkModalOpen, setIsMilkModalOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isContactingDeveloper, setIsContactingDeveloper] = useState(false)
  const [breadScoreBreakdown, setBreadScoreBreakdown] = useState<BreadScoreBreakdown | null>(null)
  const [milkPoints, setMilkPoints] = useState<number | null>(null)
  const [receivedReviews, setReceivedReviews] = useState<ReceivedReview[]>([])
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
        setCommunityPostCount(nextItems.length)
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
        const nextItems = (data || [])
          .map((item) => {
            const related = (item as { posts?: unknown }).posts
            const candidate = Array.isArray(related) ? related[0] : related
            return candidate && typeof candidate === 'object' ? (candidate as Post) : null
          })
          .filter((item): item is Post => Boolean(item))
        setInterestedPosts(nextItems)
        setInterestedPostCount(nextItems.length)
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
        setMilkPoints(null)
        setCommunityPostCount(null)
        setInterestedPostCount(null)
        setIsLoading(true)
        setLoadingSections({
          marketplace: false,
          community: false,
          interests: false,
        })

        const cached = readProfileViewCache(userId)
        if (cached) {
          cacheSnapshotRef.current = cached
          setProfile(cached.profile as Profile | null)
          setPosts((cached.posts || []) as Post[])
          setCommunityPosts((cached.communityPosts || []) as CommunityPost[])
          setInterestedPosts((cached.interestedPosts || []) as Post[])
          setCommunityPostCount((cached.communityPosts || []).length)
          setInterestedPostCount(ownProfile ? (cached.interestedPosts || []).length : null)
          setReceivedReviews((cached.receivedReviews || []) as ReceivedReview[])
          setBreadScoreBreakdown((cached.breadScoreBreakdown as BreadScoreBreakdown | null) || null)
          setLoadedSections({
            marketplace: true,
            community: !!cached.loadedSections.community,
            interests: ownProfile ? !!cached.loadedSections.interests : false,
          })
          setIsLoading(false)
        } else {
          cacheSnapshotRef.current = createEmptyProfileCacheData()
          setLoadedSections({
            marketplace: false,
            community: false,
            interests: false,
          })
        }

        updateSectionLoading('marketplace', true)
        const [profileResult, postsResult, milkPointResult, communityCountResult, interestedCountResult] = await Promise.all([
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
          ownProfile
            ? supabase.rpc('get_my_milk_points')
            : Promise.resolve({ data: null, error: null } as { data: number | null; error: null }),
          supabase
            .from('community_posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
          ownProfile
            ? supabase
                .from('post_interests')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
            : Promise.resolve({ count: null, error: null } as { count: number | null; error: null }),
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

        if (milkPointResult?.error) {
          logger.warn('Milk points fetch error:', milkPointResult.error)
        } else if (ownProfile) {
          setMilkPoints(
            typeof milkPointResult?.data === 'number'
              ? milkPointResult.data
              : Number(milkPointResult?.data || 0)
          )
        }

        if (communityCountResult.error) {
          logger.warn('Community post count fetch error:', communityCountResult.error)
        } else {
          setCommunityPostCount(communityCountResult.count ?? 0)
        }

        if (ownProfile) {
          if (interestedCountResult.error) {
            logger.warn('Interested post count fetch error:', interestedCountResult.error)
          } else {
            setInterestedPostCount(interestedCountResult.count ?? 0)
          }
        } else {
          setInterestedPostCount(null)
        }

        const nextProfile = profileResult.data as Profile
        const nextPosts = ((postsResult.data || []) as Post[])
        const previousCache = cacheSnapshotRef.current || createEmptyProfileCacheData()

        setProfile(nextProfile)
        setPosts(nextPosts)
        setReceivedReviews(previousCache.receivedReviews as ReceivedReview[])
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
          receivedReviews: previousCache.receivedReviews,
          loadedSections: {
            marketplace: true,
            community: previousCache.loadedSections.community,
            interests: ownProfile ? previousCache.loadedSections.interests : false,
          },
        })

        void (async () => {
          try {
            const [reviewResult, communityScoreResult] = await Promise.all([
              supabase
                .from('reviews')
                .select(`
                  id,
                  post_id,
                  rating,
                  comment,
                  created_at,
                  reviewer:reviewer_id (
                    id,
                    full_name,
                    avatar_url
                  ),
                  post:post_id (
                    id,
                    title
                  )
                `)
                .eq('reviewee_id', userId)
                .order('created_at', { ascending: false })
                .limit(30),
              supabase.rpc('calculate_community_score', { p_user_id: userId }),
            ])

            if (cancelled) return

            if (reviewResult.error) {
              logger.warn('Bread review score fetch error:', reviewResult.error)
            }

            if (communityScoreResult.error) {
              logger.warn('Bread community score fetch error:', communityScoreResult.error)
            }

            const reviewRows = ((reviewResult.data || []) as unknown as RawReceivedReview[])
            const nextReceivedReviews: ProfileViewCachedReceivedReview[] = reviewRows.map((review) => ({
              ...review,
              reviewer: Array.isArray(review.reviewer) ? (review.reviewer[0] || null) : review.reviewer,
              post: Array.isArray(review.post) ? (review.post[0] || null) : review.post,
            }))
            const reviewRatings = nextReceivedReviews.map((review) => Number(review.rating) || 0)
            const communityLikesScore = typeof communityScoreResult.data === 'number'
              ? communityScoreResult.data
              : 0
            const nextBreadScore = createBreadScoreBreakdown(nextPosts, reviewRatings, communityLikesScore)

            setReceivedReviews(nextReceivedReviews)
            setBreadScoreBreakdown(nextBreadScore)
            persistCache({
              breadScoreBreakdown: nextBreadScore,
              receivedReviews: nextReceivedReviews,
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
    if (!isOwnProfile && activeTab === 'interests') {
      setActiveTab('marketplace')
      return
    }

    if (activeTab === 'community' && !loadedSections.community && !loadingSections.community) {
      void loadCommunityPosts()
      return
    }

    if (activeTab === 'interests' && isOwnProfile && !loadedSections.interests && !loadingSections.interests) {
      void loadInterestedPosts()
    }
  }, [
    activeTab,
    isOwnProfile,
    loadedSections.community,
    loadedSections.interests,
    loadingSections.community,
    loadingSections.interests,
    loadCommunityPosts,
    loadInterestedPosts,
  ])

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

  async function contactDeveloper() {
    if (isContactingDeveloper) return

    try {
      setIsContactingDeveloper(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: byName, error: byNameError } = await supabase
        .from('profiles')
        .select('id, full_name, user_role')
        .eq('full_name', '피크닉개발자')
        .limit(1)
        .maybeSingle()

      if (byNameError) {
        logger.error('Developer lookup by name error:', byNameError)
      }

      let developerId = byName?.id || null

      if (!developerId) {
        const { data: byRole, error: byRoleError } = await supabase
          .from('profiles')
          .select('id, full_name, user_role')
          .eq('user_role', 'developer')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (byRoleError) {
          logger.error('Developer lookup by role error:', byRoleError)
        }

        developerId = byRole?.id || null
      }

      if (!developerId) {
        toast.error('개발자 계정을 찾을 수 없습니다')
        return
      }

      if (developerId === user.id) {
        toast.message('현재 개발자 계정입니다')
        router.push('/chats')
        return
      }

      const { data: roomId, error: roomError } = await supabase.rpc('get_or_create_chat_room', {
        p_user1_id: user.id,
        p_user2_id: developerId,
        p_post_id: null,
      })

      if (roomError || !roomId) {
        logger.error('Developer chat room creation error:', roomError)
        toast.error('개발자 채팅방 연결에 실패했습니다')
        return
      }

      router.push(`/chats/${roomId}`)
    } catch (error) {
      logger.error('Contact developer error:', error)
      toast.error('개발자 채팅방 연결 중 오류가 발생했습니다')
    } finally {
      setIsContactingDeveloper(false)
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

  const tabCountLabel = (_tab: ProfileTab, count: number | null) => (count === null ? '...' : String(count))
  const marketplaceTabCount = posts.length
  const communityTabCount = communityPostCount ?? (loadedSections.community ? communityPosts.length : null)
  const interestsTabCount = isOwnProfile
    ? (interestedPostCount ?? (loadedSections.interests ? interestedPosts.length : null))
    : null

  const averageReviewRating = receivedReviews.length > 0
    ? receivedReviews.reduce((sum, review) => sum + review.rating, 0) / receivedReviews.length
    : 0

  const visibleReceivedReviews = receivedReviews.slice(0, 3)

  const formatReviewDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
    })
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

              {/* Bread + Milk Badge */}
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
                    <div className="flex items-center gap-2 flex-wrap">
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

                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={() => setIsMilkModalOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
                        >
                          <span role="img" aria-label="우유">🥛</span>
                          내 밀크 포인트 {profile.user_role === 'developer' ? '무제한 ∞' : (milkPoints ?? '...')}
                        </button>
                      )}
                    </div>
                  )
                })()}
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

            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-3 gap-3">
              <h2 className="text-sm font-semibold">받은 거래 리뷰</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= Math.round(averageReviewRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground/40'
                      }`}
                    />
                  ))}
                </div>
                <span>{receivedReviews.length > 0 ? averageReviewRating.toFixed(1) : '0.0'}점</span>
                <span>·</span>
                <span>{receivedReviews.length}건</span>
              </div>
            </div>

            {visibleReceivedReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                아직 받은 거래 리뷰가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {visibleReceivedReviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-border px-3 py-2.5 bg-transparent">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="min-w-0 flex items-center gap-2">
                        <UserAvatar
                          src={review.reviewer?.avatar_url || null}
                          alt={review.reviewer?.full_name || '리뷰 작성자'}
                          breadLevel={1}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {review.reviewer?.full_name || '익명 사용자'}
                          </p>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={`${review.id}-${star}`}
                                className={`w-3.5 h-3.5 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground/30'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatReviewDate(review.created_at)}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap line-clamp-2">
                        {review.comment}
                      </p>
                    )}
                    <div className="mt-1.5">
                      <Link
                        href={`/post/${review.post_id}`}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors line-clamp-1"
                      >
                        거래글: {review.post?.title || '게시글 보기'}
                      </Link>
                    </div>
                  </div>
                ))}
                {receivedReviews.length > visibleReceivedReviews.length && (
                  <p className="text-xs text-muted-foreground">
                    최근 리뷰 {visibleReceivedReviews.length}건을 표시 중입니다.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div>
        <div className="max-w-4xl mx-auto px-4">
          <div className={`grid gap-2 ${isOwnProfile ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm transition-colors ${
                activeTab === 'marketplace'
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>중고거래</span>
              <span className="text-xs font-medium">({tabCountLabel('marketplace', marketplaceTabCount)})</span>
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm transition-colors ${
                activeTab === 'community'
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>동네생활</span>
              <span className="text-xs font-medium">({tabCountLabel('community', communityTabCount)})</span>
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('interests')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm transition-colors ${
                  activeTab === 'interests'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>관심</span>
                <span className="text-xs font-medium">({tabCountLabel('interests', interestsTabCount)})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 게시물 목록 */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'interests' ? (
          <>
            {!isOwnProfile ? (
              <div className="text-center py-16 text-muted-foreground">
                관심 탭은 본인만 확인할 수 있습니다
              </div>
            ) : loadingSections.interests && !loadedSections.interests ? (
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

      <div className="max-w-4xl mx-auto px-4 pb-24">
        {/* 로그아웃 버튼 */}
        {isOwnProfile && (
          <button
            onClick={requestLogout}
            className="w-full py-4 text-center text-muted-foreground hover:text-destructive transition-colors"
          >
            로그아웃
          </button>
        )}

        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={contactDeveloper}
            disabled={isContactingDeveloper}
            className="min-w-44"
          >
            {isContactingDeveloper ? '연결 중...' : '개발자에게 연락하기'}
          </Button>
          <p className="text-xs text-muted-foreground">(주)모스트월드</p>
        </div>
      </div>

      {/* 브레드 등급 설명 모달 */}
      <BreadLevelModal
        open={isBreadModalOpen}
        onOpenChange={setIsBreadModalOpen}
        currentLevel={profile.bread_level || 1}
        currentRole={profile.user_role}
        currentScore={breadScoreBreakdown?.totalScore || 0}
        scoreBreakdown={breadScoreBreakdown}
      />

      <MilkPointModal
        open={isMilkModalOpen}
        onOpenChange={setIsMilkModalOpen}
        currentPoints={milkPoints}
        isUnlimited={profile.user_role === 'developer'}
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
