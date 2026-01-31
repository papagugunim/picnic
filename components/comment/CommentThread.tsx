'use client'

import { useState, useCallback } from 'react'
import { Heart, MessageCircle, Trash2, ChevronDown, ChevronUp, Send, Flag } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/ui/user-avatar'
import { getBreadEmoji } from '@/lib/bread'
import { cn } from '@/lib/utils'
import type { ThreadedComment } from '@/types'
import { ReportDialog } from '@/components/admin/ReportDialog'

interface CommentThreadProps {
  comment: ThreadedComment
  currentUserId: string | null
  isAdmin: boolean
  onLike: (commentId: string, isLiked: boolean) => void
  onReply: (parentId: string, content: string) => Promise<void>
  onDelete: (commentId: string) => void
  formatTimeAgo: (dateString: string) => string
}

export function CommentThread({
  comment,
  currentUserId,
  isAdmin,
  onLike,
  onReply,
  onDelete,
  formatTimeAgo,
}: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(true)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const canReply = comment.depth < 2
  const canDelete = currentUserId === comment.user_id || isAdmin
  const hasReplies = comment.replies && comment.replies.length > 0

  const handleSubmitReply = useCallback(async () => {
    if (!replyContent.trim() || isSubmitting) return

    try {
      setIsSubmitting(true)
      await onReply(comment.id, replyContent.trim())
      setReplyContent('')
      setShowReplyInput(false)
    } finally {
      setIsSubmitting(false)
    }
  }, [comment.id, replyContent, isSubmitting, onReply])

  const handleDeleteClick = useCallback(() => {
    if (confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
      onDelete(comment.id)
    }
  }, [comment.id, onDelete])

  return (
    <div className={cn('relative', comment.depth > 0 && 'pl-6')}>
      {/* Thread connector line */}
      {comment.depth > 0 && (
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
      )}

      <div className="flex items-start gap-3 relative">
        {/* Horizontal connector for replies */}
        {comment.depth > 0 && (
          <div className="absolute left-0 top-5 w-3 h-0.5 bg-border" />
        )}

        {/* Avatar */}
        <Link href={`/profile/${comment.user_id}`} className="flex-shrink-0">
          <UserAvatar
            src={comment.profiles.avatar_url}
            alt={comment.profiles.full_name || '사용자'}
            breadLevel={comment.profiles.bread_level}
            size="sm"
          />
        </Link>

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          <div className="bg-secondary rounded-lg p-3">
            <Link
              href={`/profile/${comment.user_id}`}
              className="font-semibold text-sm hover:underline inline-flex items-center gap-1"
            >
              <span>{comment.profiles.full_name || '익명'}</span>
              <span className="text-sm">
                {getBreadEmoji(comment.profiles.bread_level, comment.profiles.user_role || undefined)}
              </span>
            </Link>
            <p className="text-sm mt-1 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2 px-2 text-xs">
            <button
              onClick={() => onLike(comment.id, comment.is_liked)}
              className={cn(
                'flex items-center gap-1 hover:text-primary transition-colors',
                comment.is_liked ? 'text-red-500' : 'text-muted-foreground'
              )}
            >
              <Heart
                className={cn('w-4 h-4', comment.is_liked && 'fill-current')}
              />
              <span>{comment.likes_count || 0}</span>
            </button>

            {canReply && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>답글</span>
              </button>
            )}

            <span className="text-muted-foreground">
              {formatTimeAgo(comment.created_at)}
            </span>

            {currentUserId !== comment.user_id && (
              <button
                onClick={() => setIsReportDialogOpen(true)}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <Flag className="w-4 h-4" />
                <span>신고</span>
              </button>
            )}

            {canDelete && (
              <button
                onClick={handleDeleteClick}
                className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors ml-auto"
              >
                <Trash2 className="w-4 h-4" />
                <span>{currentUserId === comment.user_id ? '삭제' : '관리자 삭제'}</span>
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className="flex gap-2 mt-3 pl-2">
              <Textarea
                placeholder="답글을 입력하세요..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={1}
                className="resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitReply()
                  }
                }}
              />
              <Button
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || isSubmitting}
                size="icon"
                className="flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Toggle replies button */}
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-primary text-sm mt-3 hover:underline"
            >
              {showReplies ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>답글 {comment.replies!.length}개 숨기기</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>답글 {comment.replies!.length}개 보기</span>
                </>
              )}
            </button>
          )}

          {/* Replies */}
          {showReplies && hasReplies && (
            <div className="mt-3 space-y-3">
              {comment.replies!.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onLike={onLike}
                  onReply={onReply}
                  onDelete={onDelete}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 신고 다이얼로그 */}
      <ReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        targetType="comment"
        targetId={comment.id}
      />
    </div>
  )
}
