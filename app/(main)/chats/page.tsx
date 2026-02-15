'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useEffect, useRef } from 'react'
import { Loader2, MessageCircle, Package } from 'lucide-react'
import Link from 'next/link'
import { useChats } from '@/lib/hooks/useChats'
import { getRandomLoadingMessage } from '@/lib/loading-messages'
import { getBreadEmoji } from '@/lib/bread'
import { SwipeableChatItem } from '@/components/chat/SwipeableChatItem'
import { toast } from 'sonner'
import { formatTimeAgo } from '@/lib/utils/date'
import { getPostStatusInfo, type PostStatus } from '@/lib/post-status'

type PostWithImages = { images?: string[] | string | null } | null | undefined

function getPostThumbnailUrl(post: PostWithImages): string | null {
  const images = post?.images

  if (Array.isArray(images)) {
    const url = images.find((img) => typeof img === 'string' && img.trim().length > 0)
    return url || null
  }

  if (typeof images === 'string') {
    const trimmed = images.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          const url = parsed.find((img) => typeof img === 'string' && img.trim().length > 0)
          return url || null
        }
      } catch {
        return null
      }
    }

    return trimmed
  }

  return null
}

export default function ChatsPage() {
  const { chatRooms, isLoading, isFetchingMore, hasMore, error, mutate, loadMore } = useChats()
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasMore) return

    const sentinel = loadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '240px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore, chatRooms.length])

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const response = await fetch(`/api/chat-rooms/${roomId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('채팅방 삭제 실패')
      }

      // 삭제 성공 시 목록 업데이트
      mutate()
      toast.success('채팅방이 삭제되었습니다')
    } catch (error) {
      logger.error('Delete room error:', error)
      toast.error('채팅방 삭제에 실패했습니다')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{getRandomLoadingMessage()}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <p className="text-sm text-muted-foreground">페이지를 새로고침 해주세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-background">
          <div className="px-4 py-2.5">
            <h1 className="text-lg font-bold">채팅</h1>
          </div>
        </div>

        {/* Chat Rooms List */}
        <div>
          {chatRooms.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">아직 채팅이 없습니다</p>
              <p className="text-sm text-muted-foreground mt-2">
                게시글에서 &quot;채팅하기&quot; 버튼을 눌러 대화를 시작해보세요
              </p>
            </div>
          ) : (
            <div>
              {chatRooms.map((room) => {
                const thumbnailUrl = getPostThumbnailUrl(room.post)
                const postStatus: PostStatus = (room.post?.status as PostStatus | undefined) || 'active'
                const postStatusInfo = getPostStatusInfo(postStatus)
                return (
                  <SwipeableChatItem
                    key={room.id}
                    onDelete={() => handleDeleteRoom(room.id)}
                  >
                    <Link
                      href={`/chats/${room.id}`}
                      className="block hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 p-4">
                        {/* Product Thumbnail */}
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={room.post?.title || '상품 이미지'}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-border"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Post Title */}
                          {room.post && (
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                <h3 className="font-semibold text-base truncate">
                                  {room.post.title}
                                </h3>
                                <span
                                  className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${postStatusInfo.bgColor} ${postStatusInfo.textColor}`}
                                >
                                  {postStatusInfo.label}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {room.last_message_at ? formatTimeAgo(room.last_message_at) : ''}
                              </span>
                            </div>
                          )}

                          {/* Other User Name */}
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {room.other_user.full_name || '익명'}
                              </span>
                              <span className="text-sm">
                                {getBreadEmoji(room.other_user.bread_level || 1, room.other_user.user_role || undefined)}
                              </span>
                            </div>
                            {room.post?.price !== null && room.post?.price !== undefined && (
                              <>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs font-medium text-primary">
                                  {room.post.price === 0 ? '무료나눔' : `${room.post.price.toLocaleString()}₽`}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Last Message */}
                          <p className={`text-sm truncate ${room.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {room.last_message || '아직 메시지가 없습니다'}
                          </p>
                        </div>

                        {/* Unread Badge */}
                        {room.unread_count > 0 && (
                          <div className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {room.unread_count > 99 ? '99+' : room.unread_count}
                          </div>
                        )}
                      </div>
                    </Link>
                  </SwipeableChatItem>
                )
              })}

              {hasMore && <div ref={loadMoreRef} className="h-4" />}

              {isFetchingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!hasMore && chatRooms.length > 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  모든 채팅방을 불러왔습니다
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
