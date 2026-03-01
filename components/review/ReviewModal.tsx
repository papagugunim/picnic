'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('ReviewModal')
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  reviewerId: string
  revieweeId: string
  revieweeName: string
  onSubmit: (postId: string, reviewerId: string, revieweeId: string, rating: number, comment?: string) => Promise<void>
  title?: string
  description?: string
  submitLabel?: string
  successMessage?: string
  errorMessage?: string
}

export function ReviewModal({
  open,
  onOpenChange,
  postId,
  reviewerId,
  revieweeId,
  revieweeName,
  onSubmit,
  title = '거래 평가 및 판매완료',
  description,
  submitLabel = '리뷰 남기고 판매완료',
  successMessage = '판매가 완료되었습니다! 리뷰가 작성되었습니다.',
  errorMessage = '판매완료 처리에 실패했습니다',
}: ReviewModalProps) {
  const [rating, setRating] = useState(5)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (rating === 0) {
      toast.error('별점을 선택해주세요')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(postId, reviewerId, revieweeId, rating, comment || undefined)
      toast.success(successMessage)
      onOpenChange(false)
      setRating(5)
      setComment('')
    } catch (error) {
      logger.error('Submit review error:', error)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSkip() {
    onOpenChange(false)
    setRating(5)
    setComment('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] glass">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {description || `${revieweeName}님과의 거래는 어떠셨나요? 리뷰를 작성하면 판매가 완료됩니다.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* 별점 선택 */}
            <div className="grid gap-2">
              <Label>별점 *</Label>
              <div className="flex gap-2 items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-400">
                  {rating === 0 ? '선택 안 함' : `${rating}점`}
                </span>
              </div>
            </div>

            {/* 코멘트 입력 */}
            <div className="grid gap-2">
              <Label htmlFor="comment">코멘트 (선택)</Label>
              <Textarea
                id="comment"
                placeholder="거래 경험을 공유해주세요"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <div className="text-xs text-gray-400 text-right">
                {comment.length}/500
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '처리 중...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
