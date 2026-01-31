'use client'

import { useState, useEffect, useCallback } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CommentThread } from './CommentThread'
import { createClient } from '@/lib/supabase/client'
import { createNamespacedLogger } from '@/lib/logger'
import type { ThreadedComment } from '@/types'

const logger = createNamespacedLogger('CommentSection')

interface CommentSectionProps {
  postId: string
  currentUserId: string | null
  isAdmin: boolean
  onCommentCountChange?: (count: number) => void
}

export function CommentSection({
  postId,
  currentUserId,
  isAdmin,
  onCommentCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<ThreadedComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return '방금 전'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`
    return date.toLocaleDateString('ko-KR')
  }, [])

  // Build tree structure from flat comments
  const buildCommentTree = useCallback((flatComments: ThreadedComment[]): ThreadedComment[] => {
    const commentMap = new Map<string, ThreadedComment>()
    const rootComments: ThreadedComment[] = []

    // First pass: create map of all comments
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // Second pass: build tree
    flatComments.forEach(comment => {
      const currentComment = commentMap.get(comment.id)!
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        const parent = commentMap.get(comment.parent_id)!
        if (!parent.replies) parent.replies = []
        parent.replies.push(currentComment)
      } else {
        rootComments.push(currentComment)
      }
    })

    // Sort all levels by created_at
    const sortByDate = (a: ThreadedComment, b: ThreadedComment) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

    const sortReplies = (comments: ThreadedComment[]) => {
      comments.sort(sortByDate)
      comments.forEach(c => {
        if (c.replies && c.replies.length > 0) {
          sortReplies(c.replies)
        }
      })
    }

    sortReplies(rootComments)
    return rootComments
  }, [])

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Fetch all comments for this post
      const { data: commentsData, error: commentsError } = await supabase
        .from('community_comments')
        .select(`
          id,
          post_id,
          user_id,
          content,
          parent_id,
          depth,
          reply_count,
          created_at,
          updated_at,
          profiles!community_comments_user_id_fkey (
            full_name,
            avatar_url,
            bread_level,
            user_role
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (commentsError) {
        logger.error('Comments fetch error:', commentsError)
        return
      }

      const commentIds = (commentsData || []).map(c => c.id)

      // Fetch all likes for these comments in one query
      let likesData: { comment_id: string; user_id: string }[] = []
      if (commentIds.length > 0 && currentUserId) {
        const { data } = await supabase
          .from('community_likes')
          .select('comment_id, user_id')
          .in('comment_id', commentIds)

        likesData = data || []
      }

      // Build likes map
      const likesCountMap = new Map<string, number>()
      const userLikesSet = new Set<string>()

      likesData.forEach(like => {
        if (like.comment_id) {
          likesCountMap.set(like.comment_id, (likesCountMap.get(like.comment_id) || 0) + 1)
          if (like.user_id === currentUserId) {
            userLikesSet.add(like.comment_id)
          }
        }
      })

      // Map comments with profile and likes data
      const commentsWithData = (commentsData || []).map(comment => {
        const author = Array.isArray(comment.profiles)
          ? comment.profiles[0]
          : comment.profiles

        return {
          ...comment,
          profiles: author || {
            full_name: null,
            avatar_url: null,
            bread_level: 0,
            user_role: null,
          },
          likes_count: likesCountMap.get(comment.id) || 0,
          is_liked: userLikesSet.has(comment.id),
        } as ThreadedComment
      })

      const tree = buildCommentTree(commentsWithData)
      setComments(tree)

      // Calculate total comment count
      const totalCount = commentsData?.length || 0
      onCommentCountChange?.(totalCount)
    } catch (err) {
      logger.error('Fetch comments error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [postId, currentUserId, buildCommentTree, onCommentCountChange])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleLike = useCallback(async (commentId: string, isLiked: boolean) => {
    if (!currentUserId) return

    // Optimistic update helper
    const updateLikeInTree = (comments: ThreadedComment[]): ThreadedComment[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            is_liked: !isLiked,
            likes_count: isLiked ? comment.likes_count - 1 : comment.likes_count + 1,
          }
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateLikeInTree(comment.replies),
          }
        }
        return comment
      })
    }

    // Optimistic update
    setComments(prev => updateLikeInTree(prev))

    try {
      const supabase = createClient()

      if (isLiked) {
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
    } catch (err) {
      logger.error('Toggle like error:', err)
      // Revert on error
      setComments(prev => updateLikeInTree(prev))
    }
  }, [currentUserId])

  const handleReply = useCallback(async (parentId: string, content: string) => {
    if (!currentUserId || !content.trim()) return

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: currentUserId,
          content: content.trim(),
          parent_id: parentId,
        })

      if (error) {
        logger.error('Reply submit error:', error)
        throw error
      }

      // Refresh comments to get the new reply
      await fetchComments()
    } catch (err) {
      logger.error('Reply error:', err)
      throw err
    }
  }, [postId, currentUserId, fetchComments])

  const handleDelete = useCallback(async (commentId: string) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId)

      if (error) {
        logger.error('Comment delete error:', error)
        alert('댓글 삭제 중 오류가 발생했습니다')
        return
      }

      // Refresh comments
      await fetchComments()
    } catch (err) {
      logger.error('Delete error:', err)
      alert('댓글 삭제 중 오류가 발생했습니다')
    }
  }, [fetchComments])

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || !currentUserId || isSubmitting) return

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
        logger.error('Comment submit error:', error)
        return
      }

      setNewComment('')
      await fetchComments()
    } catch (err) {
      logger.error('Submit error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [postId, currentUserId, newComment, isSubmitting, fetchComments])

  // Count total comments including replies
  const countAllComments = useCallback((comments: ThreadedComment[]): number => {
    return comments.reduce((count, comment) => {
      return count + 1 + (comment.replies ? countAllComments(comment.replies) : 0)
    }, 0)
  }, [])

  const totalCommentCount = countAllComments(comments)

  return (
    <div className="flex flex-col h-full">
      {/* Comments header */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-bold">
          댓글 {totalCommentCount}개
        </h2>
      </div>

      {/* Comments list */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            댓글을 불러오는 중...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            첫 댓글을 작성해보세요
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onLike={handleLike}
                onReply={handleReply}
                onDelete={handleDelete}
                formatTimeAgo={formatTimeAgo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comment input - fixed at bottom */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="댓글을 입력하세요..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={1}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmitComment()
              }
            }}
          />
          <Button
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
