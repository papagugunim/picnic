'use client'

import { MessageCircle, Package } from 'lucide-react'
import Link from 'next/link'
import { useChats } from '@/lib/hooks/useChats'
import { getRandomLoadingMessage } from '@/lib/loading-messages'
import { getBreadInfo, getBreadEmoji } from '@/lib/bread'

export default function ChatsPage() {
  const { chatRooms, isLoading, error } = useChats()

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return ''

    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return '방금 전'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`
    return date.toLocaleDateString('ko-KR')
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
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold">채팅</h1>
          </div>
        </div>

        {/* Chat Rooms List */}
        <div>
          {chatRooms.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">아직 채팅이 없습니다</p>
              <p className="text-sm text-muted-foreground mt-2">
                게시글에서 "채팅하기" 버튼을 눌러 대화를 시작해보세요
              </p>
            </div>
          ) : (
            <div>
              {chatRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/chats/${room.id}`}
                  className="block border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 p-4">
                    {/* Product Thumbnail */}
                    {room.post?.images?.[0] ? (
                      <img
                        src={room.post.images[0]}
                        alt={room.post.title || '상품 이미지'}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-border"
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
                          <h3 className="font-semibold text-base truncate pr-2">
                            {room.post.title}
                          </h3>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTimeAgo(room.last_message_at)}
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
                            {getBreadEmoji(room.other_user.matryoshka_level || 1, room.other_user.user_role || undefined)}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
