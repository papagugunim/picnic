'use client'

import { useCallback, useState } from 'react'
import { Heart, MessageCircle, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getBreadEmoji } from '@/lib/bread'
import { UserAvatar } from '@/components/ui/user-avatar'

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
}

interface CommunityPostItemProps {
  post: CommunityPost
  onPostClick: (post: CommunityPost, e?: React.MouseEvent) => void
  onLikeToggle: (postId: string, currentlyLiked: boolean) => void
  onImageClick: (images: string[], index: number, e: React.MouseEvent) => void
  formatTimeAgo: (dateString: string) => string
  getCategoryEmoji: (category: string) => string
  getCategoryName: (category: string) => string
}

export function CommunityPostItem({
  post,
  onPostClick,
  onLikeToggle,
  onImageClick,
  formatTimeAgo,
  getCategoryEmoji,
  getCategoryName,
}: CommunityPostItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentLength = post.content.length
  const shouldTruncate = contentLength > 150

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsExpanded(prev => !prev)
  }, [])

  return (
    <article
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
        </div>

        {/* Title */}
        <h3 className="font-semibold text-[15px] mb-1">
          {post.title}
        </h3>

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
          <div className={`mb-3 rounded-2xl overflow-hidden border border-border ${
            post.images.length === 1 ? '' :
            post.images.length === 2 ? 'grid grid-cols-2 gap-0.5' :
            post.images.length === 3 ? 'grid grid-cols-2 gap-0.5' :
            'grid grid-cols-2 gap-0.5'
          }`}>
            {post.images.slice(0, 4).map((image, idx) => (
              <div
                key={idx}
                onClick={(e) => onImageClick(post.images!, idx, e)}
                className={`relative bg-muted cursor-pointer hover:opacity-90 transition-opacity ${
                  post.images!.length === 1 ? 'aspect-video' :
                  post.images!.length === 3 && idx === 0 ? 'row-span-2 aspect-square' :
                  'aspect-square'
                }`}
              >
                <Image
                  src={image}
                  alt={`이미지 ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 400px"
                  className="object-cover"
                  loading="lazy"
                  quality={75}
                />
                {idx === 3 && post.images!.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl">
                    +{post.images!.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-4 text-muted-foreground">
          <button
            onClick={(e) => onPostClick(post, e)}
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
        </div>
      </div>
    </article>
  )
}
