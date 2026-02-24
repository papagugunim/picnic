'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { Heart, MessageCircle, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { getBreadEmoji } from '@/lib/bread'
import { UserAvatar } from '@/components/ui/user-avatar'
import { InlineImageCarousel } from '@/components/community/InlineImageCarousel'

export interface CommunityPost {
  id: string
  title: string
  content: string
  images: string[] | null
  category: string
  created_at: string
  user_id: string
  view_count: number
  profiles: {
    full_name: string | null
    avatar_url: string | null
    bread_level: number
    city: string | null
    user_role: string | null
  }
  likes_count: number
  comments_count: number
  is_liked: boolean
  milk_boost_score: number
  milk_boost_until: string | null
}

interface CommunityPostItemProps {
  post: CommunityPost
  onPostClick: (post: CommunityPost, e?: React.MouseEvent) => void
  onCommentClick: (post: CommunityPost, e?: React.MouseEvent) => void
  onLikeToggle: (postId: string, currentlyLiked: boolean) => void
  onImageClick: (images: string[], index: number, e: React.MouseEvent) => void
  onBoost: (postId: string) => void
  onView?: (postId: string) => void
  currentUserId?: string | null
  boostingPostId?: string | null
  boostedPostId?: string | null
  formatTimeAgo: (dateString: string) => string
  getCategoryEmoji: (category: string) => string
  getCategoryName: (category: string) => string
}

export function CommunityPostItem({
  post,
  onPostClick,
  onCommentClick,
  onLikeToggle,
  onImageClick,
  onBoost,
  onView,
  currentUserId,
  boostingPostId,
  boostedPostId,
  formatTimeAgo,
  getCategoryEmoji,
  getCategoryName,
}: CommunityPostItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const articleRef = useRef<HTMLElement>(null)
  const viewedRef = useRef(false)
  const isBoostActive = !!post.milk_boost_until && new Date(post.milk_boost_until).getTime() > Date.now()
  const isBoosting = boostingPostId === post.id
  const isBoostedJustNow = boostedPostId === post.id

  // 화면에 노출되면 조회수 카운팅
  useEffect(() => {
    const el = articleRef.current
    if (!el || !onView || viewedRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewedRef.current) {
          viewedRef.current = true
          onView(post.id)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [post.id, onView])
  const contentLength = post.content.length
  const shouldTruncate = contentLength > 150

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsExpanded(prev => !prev)
  }, [])

  return (
    <article
      ref={articleRef}
      className="flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onPostClick(post)}
    >
      {/* Profile photo */}
      <Link
        href={`/profile/${post.user_id}`}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0"
      >
        <UserAvatar
          src={post.profiles.avatar_url}
          alt={post.profiles.full_name || '사용자'}
          breadLevel={post.profiles.bread_level}
          size="md"
        />
      </Link>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {/* Header: name + category + time */}
        <div className="flex items-center gap-1 text-sm mb-1">
          <Link
            href={`/profile/${post.user_id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold hover:underline truncate"
          >
            {post.profiles.full_name || '익명'}
          </Link>
          <span className="text-base flex-shrink-0">
            {getBreadEmoji(post.profiles.bread_level, post.profiles.user_role || undefined)}
          </span>
          <span className="text-muted-foreground flex-shrink-0">·</span>
          <span className="text-xs px-1.5 py-0.5 bg-secondary rounded-full text-muted-foreground flex-shrink-0">
            {getCategoryEmoji(post.category)} {getCategoryName(post.category)}
          </span>
          <span className="text-muted-foreground flex-shrink-0">·</span>
          <span className="text-muted-foreground flex-shrink-0">
            {formatTimeAgo(post.created_at)}
          </span>
          {isBoostActive && (
            <>
              <span className="text-muted-foreground flex-shrink-0">·</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                <span className="inline-block animate-pulse" role="img" aria-label="우유">🥛</span>
                밀크 부스트 적용 중
              </span>
            </>
          )}
        </div>

        {/* Body */}
        <div className="text-[15px] leading-relaxed mb-2">
          {shouldTruncate && !isExpanded ? (
            <>
              <span className="whitespace-pre-wrap">{post.content.slice(0, 150)}...</span>
              <button
                onClick={toggleExpand}
                className="text-primary hover:underline ml-1"
              >
                더 보기
              </button>
            </>
          ) : (
            <span className="whitespace-pre-wrap">{post.content}</span>
          )}
        </div>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <InlineImageCarousel
            images={post.images}
            className="mb-3"
            maxHeightClassName="max-h-[460px]"
            stopPropagation
            onImageClick={(index, event) => onImageClick(post.images!, index, event)}
          />
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-4 text-muted-foreground">
          <button
            onClick={(e) => onCommentClick(post, e)}
            className="flex items-center gap-2 p-2 -ml-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors group"
            aria-label="댓글"
          >
            <MessageCircle className="w-[18px] h-[18px]" />
            <span className="text-sm">{post.comments_count || 0}</span>
          </button>

          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onLikeToggle(post.id, post.is_liked)
            }}
            className={`flex items-center gap-2 p-2 rounded-full hover:bg-red-500/10 transition-colors group ${
              post.is_liked ? 'text-red-500' : 'hover:text-red-500'
            }`}
            aria-label="좋아요"
          >
            <Heart className={`w-[18px] h-[18px] ${post.is_liked ? 'fill-current' : ''}`} />
            <span className="text-sm">{post.likes_count || 0}</span>
          </button>

          <div className="flex items-center gap-2 p-2 rounded-full">
            <BarChart2 className="w-[18px] h-[18px]" />
            <span className="text-sm">{post.view_count || 0}</span>
          </div>

          {currentUserId === post.user_id && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onBoost(post.id)
              }}
              disabled={isBoosting}
              className="flex items-center gap-2 p-2 rounded-full text-primary hover:bg-primary/10 disabled:opacity-60"
              aria-label="밀크 부스트"
            >
              <span
                className={`inline-block text-base leading-none ${isBoosting ? 'animate-bounce' : ''} ${isBoostedJustNow ? 'animate-pulse' : ''}`}
                role="img"
                aria-label="우유"
              >
                🥛
              </span>
              <span className="text-sm">{isBoosting ? '적용중' : '밀크 사용'}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
