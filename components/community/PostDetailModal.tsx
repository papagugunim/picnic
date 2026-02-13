'use client'

import { useState, useCallback } from 'react'
import { Heart, MessageCircle, Eye, ChevronLeft, MoreVertical, Trash2, Edit, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { getBreadEmoji } from '@/lib/bread'
import { UserAvatar } from '@/components/ui/user-avatar'
import { CommentSection } from '@/components/comment/CommentSection'
import { ReportDialog } from '@/components/admin/ReportDialog'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import type { CommunityPost } from './CommunityPostItem'

interface PostDetailModalProps {
  post: CommunityPost
  currentUserId: string | null
  currentUserRole: string | null
  onClose: () => void
  onLikeToggle: () => void
  onDelete: () => void
  onImageClick: (images: string[], index: number, e: React.MouseEvent) => void
  onCommentCountChange: (count: number) => void
  isDeleting: boolean
  formatTimeAgo: (dateString: string) => string
  getCategoryEmoji: (category: string) => string
  getCategoryName: (category: string) => string
}

export function PostDetailModal({
  post,
  currentUserId,
  currentUserRole,
  onClose,
  onLikeToggle,
  onDelete,
  onImageClick,
  onCommentCountChange,
  isDeleting,
  formatTimeAgo,
  getCategoryEmoji,
  getCategoryName,
}: PostDetailModalProps) {
  const [modalCommentCount, setModalCommentCount] = useState(post.comments_count)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const handleCommentCountChange = useCallback((count: number) => {
    setModalCommentCount(count)
    onCommentCountChange(count)
  }, [onCommentCountChange])

  return (
    <Dialog open onOpenChange={(open) => !open && window.history.back()}>
      <DialogContent
        hideCloseButton
        className="fixed inset-0 max-w-none w-screen h-screen translate-x-0 translate-y-0 left-0 top-0 bg-background p-0 border-0 rounded-none gap-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>{post.title}</DialogTitle>
        </VisuallyHidden>

        {/* Modal Header - Fixed */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">동네생활</h1>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="더보기">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {currentUserId === post.user_id && (
                  <>
                    <DropdownMenuItem onClick={() => {
                      window.history.back()
                      window.location.href = `/community/${post.id}/edit`
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      disabled={isDeleting}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeleting ? '삭제 중...' : '삭제'}
                    </DropdownMenuItem>
                  </>
                )}
                {(currentUserRole === 'admin' || currentUserRole === 'developer') && currentUserId !== post.user_id && (
                  <>
                    <DropdownMenuItem
                      onClick={onDelete}
                      disabled={isDeleting}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeleting ? '삭제 중...' : '관리자 삭제'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {currentUserId !== post.user_id && (
                  <DropdownMenuItem onClick={() => setIsReportDialogOpen(true)}>
                    <Flag className="w-4 h-4 mr-2" />
                    신고하기
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Post Content */}
          <div className="p-4 max-w-3xl mx-auto">
            {/* Author Info */}
            <div className="flex items-start gap-3 mb-4">
              <Link href={`/profile/${post.user_id}`} onClick={() => window.history.back()}>
                <UserAvatar
                  src={post.profiles.avatar_url}
                  alt={post.profiles.full_name || '사용자'}
                  breadLevel={post.profiles.bread_level}
                  size="lg"
                />
              </Link>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/profile/${post.user_id}`}
                    onClick={() => window.history.back()}
                    className="font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>{post.profiles.full_name || '익명'}</span>
                    <span className="text-base">{getBreadEmoji(post.profiles.bread_level, post.profiles.user_role || undefined)}</span>
                  </Link>
                  <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                    {getCategoryEmoji(post.category)} {getCategoryName(post.category)}
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
                  <div
                    key={idx}
                    onClick={(e) => onImageClick(post.images!, idx, e)}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <Image
                      src={image}
                      alt={`이미지 ${idx + 1}`}
                      fill
                      sizes="(max-width: 768px) 50vw, 400px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 py-4">
              <button
                onClick={onLikeToggle}
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                aria-label="좋아요"
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
                <span>{modalCommentCount}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-6 h-6" />
                <span>{post.view_count || 0}</span>
              </div>
            </div>
          </div>

          {/* Comments Section - 인라인 입력 포함 */}
          <div className="max-w-3xl mx-auto pb-16">
            <CommentSection
              postId={post.id}
              currentUserId={currentUserId}
              isAdmin={currentUserRole === 'admin' || currentUserRole === 'developer'}
              onCommentCountChange={handleCommentCountChange}
            />
          </div>
        </div>

        {/* Report Dialog */}
        <ReportDialog
          open={isReportDialogOpen}
          onOpenChange={setIsReportDialogOpen}
          targetType="community_post"
          targetId={post.id}
        />
      </DialogContent>
    </Dialog>
  )
}
