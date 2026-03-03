'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CommentThread } from './CommentThread'
import { createClient } from '@/lib/supabase/client'
import { createNamespacedLogger } from '@/lib/logger'
import { formatTimeAgo } from '@/lib/utils/date'
import { toast } from 'sonner'
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
  const commentIdSetRef = useRef(new Set<string>())
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Use ref to avoid infinite loop with onCommentCountChange callback
  const onCommentCountChangeRef = useRef(onCommentCountChange)
  onCommentCountChangeRef.current = onCommentCountChange

  // 루트 댓글: 좋아요 많은 순 -> 동일 좋아요면 최신순
  // 답글: 시간순(오래된 순)으로 대화 흐름 유지
  const sortCommentTree = useCallback((tree: ThreadedComment[]): ThreadedComment[] => {
    const sortByDateAsc = (a: ThreadedComment, b: ThreadedComment) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

    const sortByPopularity = (a: ThreadedComment, b: ThreadedComment) => {
      if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }

    const cloneAndSort = (comments: ThreadedComment[], isRoot: boolean): ThreadedComment[] => {
      const cloned = comments.map(comment => ({
        ...comment,
        replies: comment.replies ? cloneAndSort(comment.replies, false) : [],
      }))

      cloned.sort(isRoot ? sortByPopularity : sortByDateAsc)
      return cloned
    }

    return cloneAndSort(tree, true)
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

    return sortCommentTree(rootComments)
  }, [sortCommentTree])

  const fetchComments = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setIsLoading(true)
      }
      const supabase = createClient()

      logger.log('Fetching comments for post:', postId)

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
          profiles (
            full_name,
            avatar_url,
            bread_level,
            user_role
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      logger.log('Comments query result:', { count: commentsData?.length, error: commentsError })

      if (commentsError) {
        logger.error('Comments fetch error:', commentsError)
        setIsLoading(false)
        return
      }

      const commentIds = (commentsData || []).map(c => c.id)

      // Fetch all likes for these comments in one query
      let likesData: { comment_id: string; user_id: string }[] = []
      if (commentIds.length > 0) {
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
      onCommentCountChangeRef.current?.(totalCount)
    } catch (err) {
      logger.error('Fetch comments error:', err)
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }, [postId, currentUserId, buildCommentTree])

  useEffect(() => {
    fetchComments()
  }, [postId, currentUserId])

  const handleLike = useCallback(async (commentId: string, isLiked: boolean) => {
    if (!currentUserId) {
      toast.error('로그인이 필요합니다.')
      return
    }

    // Optimistic update helper
    const updateLikeInTree = (tree: ThreadedComment[]): ThreadedComment[] => {
      return tree.map(comment => {
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
            replies: updateLikeInTree(comment.replies)
          }
        }
        return comment
      })
    }

    // Optimistic update
    setComments(prev => sortCommentTree(updateLikeInTree(prev)))

    try {
      const supabase = createClient()

      // 클라이언트 인증 확인
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setComments(prev => sortCommentTree(updateLikeInTree(prev)))
        toast.error('로그인이 필요합니다.')
        return
      }

      if (isLiked) {
        const { error } = await supabase
          .from('community_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('community_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          })
        if (error) throw error
      }

      // 서버 기준으로 한 번 더 동기화해서 정렬/카운트 일관성 유지
      await fetchComments(false)
    } catch (err) {
      logger.error('Toggle like error:', err)
      toast.error('좋아요 처리 중 오류가 발생했습니다')
      // Revert on error
      setComments(prev => sortCommentTree(updateLikeInTree(prev)))
    }
  }, [currentUserId, fetchComments, sortCommentTree])

  const handleReply = useCallback(async (parentId: string, content: string) => {
    if (!currentUserId || !content.trim()) return

    try {
      const supabase = createClient()

      // 클라이언트 인증 확인 - RLS와 일치하는 실제 user.id 사용
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('로그인이 필요합니다. 페이지를 새로고침해주세요.')
        return
      }

      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId,
        })

      if (error) {
        logger.error('Reply submit error:', error)
        toast.error(error.message || '답글 작성 중 오류가 발생했습니다')
        throw error
      }

      // Refresh comments to get the new reply
      await fetchComments(false)
    } catch (err) {
      logger.error('Reply error:', err)
      if (!(err instanceof Error && err.message)) {
        toast.error('답글 작성 중 오류가 발생했습니다')
      }
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
        toast.error('댓글 삭제 중 오류가 발생했습니다')
        return
      }

      // Refresh comments
      await fetchComments(false)
    } catch (err) {
      logger.error('Delete error:', err)
      toast.error('댓글 삭제 중 오류가 발생했습니다')
    }
  }, [fetchComments])

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || !currentUserId || isSubmitting) return

    try {
      setIsSubmitting(true)
      const supabase = createClient()

      // 클라이언트 인증 확인 - RLS와 일치하는 실제 user.id 사용
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('로그인이 필요합니다. 페이지를 새로고침해주세요.')
        return
      }

      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        })

      if (error) {
        logger.error('Comment submit error:', error)
        toast.error(error.message || '댓글 작성 중 오류가 발생했습니다')
        return
      }

      setNewComment('')
      await fetchComments(false)
    } catch (err) {
      logger.error('Submit error:', err)
      toast.error('댓글 작성 중 오류가 발생했습니다')
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

  useEffect(() => {
    const ids = new Set<string>()
    const walk = (nodes: ThreadedComment[]) => {
      nodes.forEach((node) => {
        ids.add(node.id)
        if (node.replies && node.replies.length > 0) {
          walk(node.replies)
        }
      })
    }
    walk(comments)
    commentIdSetRef.current = ids
  }, [comments])

  useEffect(() => {
    if (!postId) return

    const supabase = createClient()
    const scheduleSync = () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current)
      }
      syncTimerRef.current = setTimeout(() => {
        void fetchComments(false)
      }, 180)
    }

    const channel = supabase
      .channel(`comment-section-sync:${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_comments', filter: `post_id=eq.${postId}` },
        scheduleSync
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_likes' },
        (payload) => {
          const commentId = (payload.new as { comment_id?: string } | null)?.comment_id
            || (payload.old as { comment_id?: string } | null)?.comment_id
          if (commentId && commentIdSetRef.current.has(commentId)) {
            scheduleSync()
          }
        }
      )
      .subscribe()

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current)
      }
      void supabase.removeChannel(channel)
    }
  }, [fetchComments, postId])

  return (
    <div className="flex flex-col">
      {/* Comments header */}
      <div className="px-4 py-4">
        <h2 className="text-lg font-bold">
          댓글 {totalCommentCount}개
        </h2>
      </div>

      {/* Inline comment input - X.com 스타일: 댓글 목록 위에 배치 */}
      <div className="px-4 pb-4 border-b border-border">
        {currentUserId ? (
          <div className="flex gap-2 items-center">
            <Textarea
              placeholder="댓글을 입력하세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={1}
              className="resize-none min-h-0 h-10 py-2"
              style={{ fontSize: '16px' }}
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
              className="flex-shrink-0 h-10 w-10"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">로그인 후 댓글을 작성할 수 있습니다</p>
        )}
      </div>

      {/* Comments list */}
      <div className="px-4 py-4">
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
    </div>
  )
}
