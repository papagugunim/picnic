'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('FeedClient')
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Plus, Heart, Bookmark, BarChart2, Loader2, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { getNearbyMetroStations, hasNearbyStation } from '@/lib/metro-utils'
import { getPostStatusInfo, type PostStatus } from '@/lib/post-status'
import { useUser } from '@/lib/contexts/UserContext'
import { formatTimeAgo } from '@/lib/utils/date'
import { getCityNameInKorean } from '@/lib/constants'
import { getRandomLoadingMessage } from '@/lib/loading-messages'
import { MILK_BOOST_COST, MILK_BOOST_DURATION_HOURS } from '@/lib/milk-points'
import { toast } from 'sonner'

interface Post {
  id: string
  author_id: string
  title: string
  price: number | null
  city: string
  neighborhood: string
  preferred_metro_stations: string[]
  created_at: string
  images: string[]
  status: string
  view_count: number
  profiles: {
    full_name: string | null
  }
  likes_count: number
  interests_count: number
  user_liked: boolean
  user_interested: boolean
  milk_boost_score: number
  milk_boost_until: string | null
}

type RankedPostRow = {
  id: string
  author_id: string
  title: string
  price: number | null
  city: string
  neighborhood: string
  preferred_metro_stations: string[] | null
  created_at: string
  images: string[] | null
  status: string
  view_count: number | null
  author_full_name: string | null
  likes_count: number | null
  interests_count: number | null
  user_liked: boolean | null
  user_interested: boolean | null
  milk_boost_score: number | string | null
  milk_boost_until: string | null
}

interface FeedPostItemProps {
  post: Post
  isDeveloper: boolean
  currentUserId: string | null
  boostingPostId: string | null
  boostedPostId: string | null
  onLikeToggle: (postId: string, currentlyLiked: boolean) => void
  onInterestToggle: (postId: string, currentlyInterested: boolean) => void
  onBoost: (postId: string) => void
  onView?: (postId: string, authorId: string) => void
}

function FeedPostItem({
  post,
  isDeveloper,
  currentUserId,
  boostingPostId,
  boostedPostId,
  onLikeToggle,
  onInterestToggle,
  onBoost,
  onView,
}: FeedPostItemProps) {
  const isHiddenPost = post.status === 'hidden'
  const isBoostActive = !!post.milk_boost_until && new Date(post.milk_boost_until).getTime() > Date.now()
  const isBoosting = boostingPostId === post.id
  const boostMenuLabel = isBoosting
    ? '밀크 부스트 적용중'
    : isBoostActive
      ? '밀크 부스트중'
      : '밀크 부스트 적용'
  const canApplyBoost = !isBoostActive && !isBoosting
  const linkRef = useRef<HTMLAnchorElement>(null)
  const viewedRef = useRef(false)

  useEffect(() => {
    const element = linkRef.current
    if (!element || !onView || viewedRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewedRef.current) {
          viewedRef.current = true
          onView(post.id, post.author_id)
          observer.disconnect()
        }
      },
      { threshold: 0.55 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [onView, post.id, post.author_id])

  return (
    <Link
      ref={linkRef}
      href={`/post/${post.id}`}
      className="relative flex gap-3 p-3 transition-colors hover:bg-muted/30"
    >
      {post.author_id === currentUserId && (
        <div
          className="absolute right-2 top-2 z-10"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="게시글 더보기"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!canApplyBoost}
                onSelect={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  if (!canApplyBoost) return
                  onBoost(post.id)
                }}
              >
                <span className="text-base leading-none">🥛</span>
                {boostMenuLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Image */}
      <div className="flex-shrink-0 w-24 h-24 bg-muted rounded-lg overflow-hidden relative">
        {post.images && post.images.length > 0 ? (
          <Image
            src={post.images[0]}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 96px, 96px"
            className="object-cover"
            loading="lazy"
            quality={75}
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            이미지 없음
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between min-w-0 pr-8">
        <div>
          <h3 className={`text-base font-normal line-clamp-2 mb-0.5 ${isHiddenPost ? 'text-muted-foreground' : ''}`}>
            {post.title}
            {isHiddenPost && <span className="ml-1 text-xs font-medium">(숨김처리)</span>}
          </h3>
          <div className="text-xs text-muted-foreground mb-0.5">
            <span>{getCityNameInKorean(post.city)}</span>
            <span> · </span>
            <span>{formatTimeAgo(post.created_at)}</span>
            {isBoostActive && (
              <>
                <span> · </span>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full px-0.5"
                  aria-label="밀크 부스트 안내"
                  title="밀크 부스트 안내"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    toast('밀크 부스터가 적용된 게시글입니다')
                  }}
                >
                  <span role="img" aria-hidden="true">🥛</span>
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-base font-bold">
              {post.price === 0 || post.price === null
                ? '무료나눔'
                : `${post.price.toLocaleString()}₽`}
            </p>
            {post.status && post.status !== 'active' && post.status !== 'hidden' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${getPostStatusInfo(post.status as PostStatus).bgColor} ${getPostStatusInfo(post.status as PostStatus).textColor} font-medium`}>
                {getPostStatusInfo(post.status as PostStatus).label}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 items-center justify-end text-xs text-muted-foreground">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onLikeToggle(post.id, post.user_liked)
            }}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            aria-label="좋아요"
          >
            <Heart
              className={`w-4 h-4 ${post.user_liked ? 'fill-red-500 text-red-500' : ''}`}
            />
            <span className={post.user_liked ? 'text-red-500' : ''}>
              {post.likes_count || 0}
            </span>
          </button>

          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onInterestToggle(post.id, post.user_interested)
            }}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            aria-label="관심 등록"
          >
            <Bookmark
              className={`w-4 h-4 ${post.user_interested ? 'fill-primary text-primary' : ''}`}
            />
            <span className={post.user_interested ? 'text-primary' : ''}>
              {post.interests_count || 0}
            </span>
          </button>

          {isDeveloper && (
            <div className="flex items-center gap-1">
              <BarChart2 className="w-4 h-4" />
              <span>{post.view_count || 0}</span>
            </div>
          )}

        </div>
      </div>
    </Link>
  )
}

const categories = [
  { id: 'all', label: '추천순' },
  { id: 'nearby', label: '가까운 동네' },
  { id: 'free', label: '무료나눔' },
]

const PAGE_SIZE = 20

interface FeedClientProps {
  initialPosts: Post[]
  initialCursor: string | null
  initialCity: string | null
}

export default function FeedClient({ initialPosts, initialCursor, initialCity }: FeedClientProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'nearby' | 'free'>('all')
  const { user, profile, loading: userLoading } = useUser()
  const [boostingPostId, setBoostingPostId] = useState<string | null>(null)
  const [boostedPostId, setBoostedPostId] = useState<string | null>(null)

  const userCity = profile?.city || null
  const userStations = useMemo(() => profile?.preferred_metro_stations ?? [], [profile?.preferred_metro_stations])
  const isInitialized = !userLoading
  const viewedPostIds = useRef(new Set<string>())

  const fetchPosts = useCallback(async (cursor: string | null) => {
    if (!user) {
      return { data: [], nextCursor: null, hasMore: false }
    }

    const supabase = createClient()
    const isAdminOrDeveloper = profile?.user_role === 'admin' || profile?.user_role === 'developer'

    const offset = cursor ? Number.parseInt(cursor, 10) || 0 : 0

    const { data: postsData, error } = await supabase.rpc('get_ranked_posts', {
      p_city: userCity,
      p_limit: PAGE_SIZE,
      p_offset: offset,
      p_include_hidden: isAdminOrDeveloper,
    })

    if (error) {
      logger.error('Ranked posts fetch error:', error)
      return { data: [], nextCursor: null, hasMore: false }
    }

    const rows = ((postsData || []) as RankedPostRow[])
    const postsWithReactions = rows.map((post) => ({
      id: post.id,
      author_id: post.author_id,
      title: post.title,
      price: post.price,
      city: post.city,
      neighborhood: post.neighborhood,
      preferred_metro_stations: post.preferred_metro_stations || [],
      created_at: post.created_at,
      images: post.images || [],
      status: post.status,
      view_count: post.view_count || 0,
      profiles: { full_name: post.author_full_name || null },
      likes_count: post.likes_count || 0,
      interests_count: post.interests_count || 0,
      user_liked: !!post.user_liked,
      user_interested: !!post.user_interested,
      milk_boost_score: Number(post.milk_boost_score || 0),
      milk_boost_until: post.milk_boost_until,
    })) as Post[]

    const nextCursor = rows.length === PAGE_SIZE
      ? String(offset + rows.length)
      : null

    return {
      data: postsWithReactions,
      nextCursor,
      hasMore: rows.length === PAGE_SIZE,
    }
  }, [userCity, user, profile?.user_role])

  const {
    data: allPosts,
    isLoading,
    isFetchingMore,
    isRefreshing,
    hasMore,
    sentinelRef,
    refresh,
    updateItem,
    reset,
  } = useInfiniteScroll<Post>({
    fetchFn: fetchPosts,
    pageSize: PAGE_SIZE,
    threshold: 300,
    enabled: isInitialized,
    initialData: initialPosts,
    initialCursor,
  })

  // Reset only when city changes (not tab - tabs filter client-side)
  const previousCityRef = useRef<string | null>(initialCity)

  useEffect(() => {
    if (!isInitialized) return
    if (previousCityRef.current === userCity) return

    previousCityRef.current = userCity
    reset()
  }, [isInitialized, userCity, reset])

  // Nearby 필터용 역 목록 (async lazy load)
  const [nearbyStationsList, setNearbyStationsList] = useState<string[]>([])

  useEffect(() => {
    if (userStations.length > 0 && userCity) {
      getNearbyMetroStations(userStations, userCity, 5).then(setNearbyStationsList)
    }
  }, [userStations, userCity])

  // Filter posts based on selected tab - memoized to prevent recalculation
  const posts = useMemo(() => {
    if (allPosts.length === 0) return []

    switch (selectedTab) {
      case 'nearby':
        if (nearbyStationsList.length > 0) {
          return allPosts.filter(post =>
            hasNearbyStation(post.preferred_metro_stations, nearbyStationsList)
          )
        }
        return allPosts

      case 'free':
        return allPosts.filter(post => post.price === 0 || post.price === null)

      case 'all':
      default:
        return allPosts
    }
  }, [allPosts, selectedTab, nearbyStationsList])

  const { boostedPosts, regularPosts } = useMemo(() => {
    if (posts.length === 0) {
      return { boostedPosts: [] as Post[], regularPosts: [] as Post[] }
    }

    const now = Date.now()
    const boosted: Post[] = []
    const regular: Post[] = []

    posts.forEach((post) => {
      const isBoostActive =
        !!post.milk_boost_until && new Date(post.milk_boost_until).getTime() > now
      if (isBoostActive) {
        boosted.push(post)
      } else {
        regular.push(post)
      }
    })

    return { boostedPosts: boosted, regularPosts: regular }
  }, [posts])

  const handlePostView = useCallback((postId: string, authorId: string) => {
    if (!user || viewedPostIds.current.has(postId) || authorId === user.id) return
    viewedPostIds.current.add(postId)

    updateItem(postId, (post) => ({ ...post, view_count: (post.view_count || 0) + 1 }))

    const supabase = createClient()
    supabase.rpc('increment_post_view_count', { p_post_id: postId }).then(() => {})
  }, [updateItem, user])

  async function toggleLike(postId: string, currentlyLiked: boolean) {
    if (!user) return

    // Optimistic update
    updateItem(postId, (post) => ({
      ...post,
      user_liked: !currentlyLiked,
      likes_count: currentlyLiked ? post.likes_count - 1 : post.likes_count + 1
    }))

    try {
      const supabase = createClient()

      if (currentlyLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)
      } else {
        await supabase
          .from('post_likes')
          .insert({ user_id: user.id, post_id: postId })
      }
    } catch (err) {
      logger.error('Toggle like error:', err)
      // Revert on error
      updateItem(postId, (post) => ({
        ...post,
        user_liked: currentlyLiked,
        likes_count: currentlyLiked ? post.likes_count + 1 : post.likes_count - 1
      }))
    }
  }

  async function toggleInterest(postId: string, currentlyInterested: boolean) {
    if (!user) return

    // Optimistic update
    updateItem(postId, (post) => ({
      ...post,
      user_interested: !currentlyInterested,
      interests_count: currentlyInterested ? post.interests_count - 1 : post.interests_count + 1
    }))

    try {
      const supabase = createClient()

      if (currentlyInterested) {
        await supabase
          .from('post_interests')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)
      } else {
        await supabase
          .from('post_interests')
          .insert({ user_id: user.id, post_id: postId })
      }
    } catch (err) {
      logger.error('Toggle interest error:', err)
      // Revert on error
      updateItem(postId, (post) => ({
        ...post,
        user_interested: currentlyInterested,
        interests_count: currentlyInterested ? post.interests_count + 1 : post.interests_count - 1
      }))
    }
  }

  const handleBoost = useCallback(async (postId: string) => {
    if (!user || boostingPostId) return

    const targetPost = allPosts.find((post) => post.id === postId)
    const hasActiveBoost = !!targetPost?.milk_boost_until && new Date(targetPost.milk_boost_until).getTime() > Date.now()
    if (hasActiveBoost) {
      toast.error('이미 밀크 부스트가 적용 중인 게시글입니다')
      return
    }

    try {
      setBoostingPostId(postId)
      const supabase = createClient()
      const { data, error } = await supabase.rpc('apply_milk_boost', {
        p_target_type: 'post',
        p_target_id: postId,
        p_points: MILK_BOOST_COST,
        p_duration_hours: MILK_BOOST_DURATION_HOURS,
      })

      if (error) {
        toast.error(error.message || '밀크 포인트 사용에 실패했습니다')
        return
      }

      const result = Array.isArray(data) ? data[0] : null
      if (result) {
        setBoostedPostId(postId)
        window.setTimeout(() => {
          setBoostedPostId((prev) => (prev === postId ? null : prev))
        }, 1400)
        updateItem(postId, (post) => ({
          ...post,
          milk_boost_until: result.boost_until || post.milk_boost_until,
          milk_boost_score: Number(result.applied_boost_score || post.milk_boost_score || 0),
        }))
      }

      toast.success('밀크 포인트 사용 완료 · 밀크 부스트 적용 중')
      await refresh()
    } catch (err) {
      logger.error('Apply milk boost error:', err)
      toast.error('밀크 포인트 사용 중 오류가 발생했습니다')
    } finally {
      setBoostingPostId(null)
    }
  }, [allPosts, boostingPostId, refresh, updateItem, user])

  if (isLoading && initialPosts.length === 0) {
    return (
      <div>
        {/* Skeleton loading */}
        <div className="divide-y divide-border">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex gap-4 p-4 animate-pulse">
              <div className="flex-shrink-0 w-28 h-28 bg-muted rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-6 bg-muted rounded w-1/4" />
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16" />
                  <div className="h-6 bg-muted rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
        {/* Category filter */}
        <div className="bg-background">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedTab(category.id as 'all' | 'nearby' | 'free')}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${
                    category.id === selectedTab
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-secondary-foreground hover:bg-muted'
                  }
                `}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Refreshing indicator */}
        {isRefreshing && (
          <div className="flex items-center justify-center py-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span className="text-sm">새로고침 중...</span>
          </div>
        )}

        {/* Posts list */}
        {posts.length === 0 ? (
          isLoading || !isInitialized ? (
            <div className="text-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">{getRandomLoadingMessage()}</p>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">아직 게시글이 없습니다</p>
              <Link href="/post/new">
                <Button>첫 게시글 작성하기</Button>
              </Link>
            </div>
          )
        ) : (
          <div>
            {boostedPosts.map((post) => (
              <FeedPostItem
                key={post.id}
                post={post}
                isDeveloper={profile?.user_role === 'developer'}
                currentUserId={user?.id || null}
                boostingPostId={boostingPostId}
                boostedPostId={boostedPostId}
                onLikeToggle={toggleLike}
                onInterestToggle={toggleInterest}
                onBoost={handleBoost}
                onView={handlePostView}
              />
            ))}

            {regularPosts.map((post) => (
              <FeedPostItem
                key={post.id}
                post={post}
                isDeveloper={profile?.user_role === 'developer'}
                currentUserId={user?.id || null}
                boostingPostId={boostingPostId}
                boostedPostId={boostedPostId}
                onLikeToggle={toggleLike}
                onInterestToggle={toggleInterest}
                onBoost={handleBoost}
                onView={handlePostView}
              />
            ))}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />

            {/* Loading more indicator */}
            {isFetchingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                모든 게시글을 불러왔습니다
              </div>
            )}
          </div>
        )}

        {/* FAB button */}
        <Button
          asChild
          className="fab flex items-center justify-center"
        >
          <Link href="/post/new">
            <Plus className="w-6 h-6" />
            <span className="sr-only">글쓰기</span>
          </Link>
        </Button>
      </div>
  )
}
