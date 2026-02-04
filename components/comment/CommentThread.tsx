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
    <div className={cn('relative', comment.depth > 0 && 'ml-12')}>
      <div className="flex gap-3">
        {/* Avatar with thread line */}
        <div className="flex flex-col items-center">
          <Link href={`/profile/${comment.user_id}`} className="flex-shrink-0">
            <UserAvatar
              src={comment.profiles.avatar_url}
              alt={comment.profiles.full_name || '사용자'}
              breadLevel={comment.profiles.bread_level}
              size="sm"
            />
          </Link>
          {/* Vertical thread line for replies */}
          {hasReplies && showReplies && (
            <div className="w-0.5 flex-1 bg-border mt-2" />
          )}
        </div>

        {/* Comment content */}
        <div className="flex-1 min-w-0 pb-3">
          {/* Header: name + emoji + time */}
          <div className="flex items-center gap-1 text-sm">
            <Link
              href={`/profile/${comment.user_id}`}
              className="font-bold hover:underline"
            >
              {comment.profiles.full_name || '익명'}
            </Link>
            <span className="text-sm">
              {getBreadEmoji(comment.profiles.bread_level, comment.profiles.user_role || undefined)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>

          {/* Content */}
          <p className="text-[15px] mt-1 whitespace-pre-wrap break-words leading-relaxed">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-5 mt-2 text-muted-foreground">
            {canReply && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="flex items-center gap-1.5 hover:text-primary transition-colors group"
              >
                <MessageCircle className="w-4 h-4" />
                {comment.reply_count > 0 && (
                  <span className="text-xs">{comment.reply_count}</span>
                )}
              </button>
            )}

            <button
              onClick={() => onLike(comment.id, comment.is_liked)}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                comment.is_liked ? 'text-red-500' : 'hover:text-red-500'
              )}
            >
              <Heart
                className={cn('w-4 h-4', comment.is_liked && 'fill-current')}
              />
              {(comment.likes_count > 0) && (
                <span className="text-xs">{comment.likes_count}</span>
              )}
            </button>

            {currentUserId !== comment.user_id && (
              <button
                onClick={() => setIsReportDialogOpen(true)}
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Flag className="w-4 h-4" />
              </button>
            )}

            {canDelete && (
              <button
                onClick={handleDeleteClick}
                className="flex items-center gap-1.5 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReplyInput && (
            <div className="flex gap-2 mt-3">
              <Textarea
                placeholder="답글을 입력하세요..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={1}
                className="resize-none text-sm min-h-0 h-10 py-2"
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
                className="flex-shrink-0 h-10 w-10"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Toggle replies button */}
          {hasReplies && !showReplies && (
            <button
              onClick={() => setShowReplies(true)}
              className="flex items-center gap-1 text-primary text-sm mt-2 hover:underline"
            >
              <ChevronDown className="w-4 h-4" />
              <span>답글 {comment.replies!.length}개 보기</span>
            </button>
          )}

          {/* Replies */}
          {showReplies && hasReplies && (
            <div className="mt-3 space-y-0">
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
              <button
                onClick={() => setShowReplies(false)}
                className="flex items-center gap-1 text-primary text-sm mt-1 ml-12 hover:underline"
              >
                <ChevronUp className="w-4 h-4" />
                <span>답글 숨기기</span>
              </button>
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
