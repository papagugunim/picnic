'use client'

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
}

export function ReviewModal({
  open,
  onOpenChange,
  postId,
  reviewerId,
  revieweeId,
  revieweeName,
  onSubmit
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
      toast.success('리뷰가 작성되었습니다')
      onOpenChange(false)
      setRating(5)
      setComment('')
    } catch (error) {
      console.error('Submit review error:', error)
      toast.error('리뷰 작성에 실패했습니다')
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
            <DialogTitle>거래 평가</DialogTitle>
            <DialogDescription>
              {revieweeName}님과의 거래는 어떠셨나요?
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
              나중에
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '작성 중...' : '리뷰 남기기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
