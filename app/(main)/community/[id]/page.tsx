'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Heart, MessageCircle, Send, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface CommunityPost {
  id: string
  title: string
  content: string
  images: string[] | null
  category: string
  created_at: string
  user_id: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
    matryoshka_level: number
  }
  likes_count: number
  comments_count: number
  is_liked: boolean
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
    matryoshka_level: number
  }
  likes_count: number
  is_liked: boolean
}

const categories = {
  question: { name: '질문', emoji: '❓' },
  info: { name: '정보', emoji: '💡' },
  event: { name: '이벤트', emoji: '🎉' },
  chat: { name: '잡담', emoji: '💬' },
  lost_found: { name: '분실물', emoji: '🔍' },
}

export default function CommunityPostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [post, setPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchPostAndComments()
  }, [postId])

  async function fetchPostAndComments() {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // Get post
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .select(`
          id,
          title,
          content,
          images,
          category,
          created_at,
          user_id,
          profiles!community_posts_user_id_fkey (
            full_name,
            avatar_url,
            matryoshka_level
          )
        `)
        .eq('id', postId)
        .single()

      if (postError) {
        console.error('Post fetch error:', postError)
        return
      }

      // Get likes count and check if user liked
      const { count: likesCount } = await supabase
        .from('community_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      const { data: userLike } = await supabase
        .from('community_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single()

      // Get comments count
      const { count: commentsCount } = await supabase
        .from('community_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      // Extract author profile (Supabase returns it as array)
      const author = Array.isArray(postData.profiles)
        ? postData.profiles[0]
        : postData.profiles

      setPost({
        ...postData,
        profiles: author,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        is_liked: !!userLike,
      } as CommunityPost)

      // Get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('community_comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles!community_comments_user_id_fkey (
            full_name,
            avatar_url,
            matryoshka_level
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (commentsError) {
        console.error('Comments fetch error:', commentsError)
        return
      }

      // For each comment, get likes count and check if user liked
      const commentsWithLikes = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { count: commentLikesCount } = await supabase
            .from('community_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', comment.id)

          const { data: userCommentLike } = await supabase
            .from('community_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('user_id', user.id)
            .single()

          // Extract author profile (Supabase returns it as array)
          const commentAuthor = Array.isArray(comment.profiles)
            ? comment.profiles[0]
            : comment.profiles

          return {
            ...comment,
            profiles: commentAuthor,
            likes_count: commentLikesCount || 0,
            is_liked: !!userCommentLike,
          }
        })
      )

      setComments(commentsWithLikes as Comment[])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function togglePostLike() {
    if (!currentUserId || !post) return

    const supabase = createClient()

    if (post.is_liked) {
      await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
    } else {
      await supabase
        .from('community_likes')
        .insert({
          post_id: postId,
          user_id: currentUserId,
        })
    }

    fetchPostAndComments()
  }

  async function toggleCommentLike(commentId: string, currentlyLiked: boolean) {
    if (!currentUserId) return

    const supabase = createClient()

    if (currentlyLiked) {
      await supabase
        .from('community_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', currentUserId)
    } else {
      await supabase
        .from('community_likes')
        .insert({
          comment_id: commentId,
          user_id: currentUserId,
        })
    }

    fetchPostAndComments()
  }

  async function submitComment() {
    if (!newComment.trim() || !currentUserId) return

    try {
      setIsSubmitting(true)
      const supabase = createClient()

      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: newComment.trim(),
        })

      if (error) {
        console.error('Comment submit error:', error)
        return
      }

      setNewComment('')
      fetchPostAndComments()
    } catch (err) {
      console.error('Submit error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
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
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">게시글을 찾을 수 없습니다</p>
          <Button onClick={() => router.push('/community')}>
            동네생활로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const category = categories[post.category as keyof typeof categories]

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">동네생활</h1>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-4">
          {/* Author Info */}
          <div className="flex items-start gap-3 mb-4">
            <Link href={`/profile/${post.user_id}`}>
              {post.profiles.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt={post.profiles.full_name || '사용자'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                  {post.profiles.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </Link>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${post.user_id}`}
                  className="font-semibold hover:underline"
                >
                  {post.profiles.full_name || '익명'}
                </Link>
                <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                  {category.emoji} {category.name}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatTimeAgo(post.created_at)}
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

          {/* Content */}
          <div className="prose prose-sm max-w-none mb-6 whitespace-pre-wrap">
            {post.content}
          </div>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {post.images.map((image, idx) => (
                <img
                  key={idx}
                  src={image}
                  alt={`이미지 ${idx + 1}`}
                  className="w-full rounded-lg object-cover aspect-square"
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 py-4 border-y border-border">
            <button
              onClick={togglePostLike}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <Heart
                className={`w-6 h-6 ${
                  post.is_liked
                    ? 'fill-red-500 text-red-500'
                    : 'text-muted-foreground'
                }`}
              />
              <span className={post.is_liked ? 'text-red-500 font-semibold' : 'text-muted-foreground'}>
                {post.likes_count}
              </span>
            </button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="w-6 h-6" />
              <span>{post.comments_count}</span>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="px-4 py-4">
          <h2 className="text-lg font-bold mb-4">
            댓글 {comments.length}개
          </h2>

          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              첫 댓글을 작성해보세요
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <Link href={`/profile/${comment.user_id}`}>
                    {comment.profiles.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt={comment.profiles.full_name || '사용자'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {comment.profiles.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </Link>

                  <div className="flex-1">
                    <div className="bg-secondary rounded-lg p-3">
                      <Link
                        href={`/profile/${comment.user_id}`}
                        className="font-semibold text-sm hover:underline"
                      >
                        {comment.profiles.full_name || '익명'}
                      </Link>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                    </div>

                    <div className="flex items-center gap-4 mt-2 px-2">
                      <button
                        onClick={() => toggleCommentLike(comment.id, comment.is_liked)}
                        className="flex items-center gap-1 text-xs hover:text-primary transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            comment.is_liked
                              ? 'fill-red-500 text-red-500'
                              : 'text-muted-foreground'
                          }`}
                        />
                        <span className={comment.is_liked ? 'text-red-500' : 'text-muted-foreground'}>
                          {comment.likes_count}
                        </span>
                      </button>

                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-30">
          <div className="max-w-4xl mx-auto flex gap-2">
            <Textarea
              placeholder="댓글을 입력하세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={1}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitComment()
                }
              }}
            />
            <Button
              onClick={submitComment}
              disabled={!newComment.trim() || isSubmitting}
              size="icon"
              className="flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
