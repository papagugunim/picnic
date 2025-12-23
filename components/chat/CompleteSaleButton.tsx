'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface CompleteSaleButtonProps {
  postId: string
  roomId: string
  buyerId: string
  sellerId: string
  onComplete: (postId: string, roomId: string, buyerId: string, sellerId: string) => Promise<void>
  onReviewRequest?: () => void
}

export function CompleteSaleButton({
  postId,
  roomId,
  buyerId,
  sellerId,
  onComplete,
  onReviewRequest
}: CompleteSaleButtonProps) {
  const [isCompleting, setIsCompleting] = useState(false)

  async function handleComplete() {
    try {
      setIsCompleting(true)
      await onComplete(postId, roomId, buyerId, sellerId)
      toast.success('판매가 완료되었습니다!')

      // 리뷰 작성 유도
      if (onReviewRequest) {
        setTimeout(() => {
          onReviewRequest()
        }, 1500)
      }
    } catch (error) {
      console.error('Complete sale error:', error)
      toast.error('판매완료 처리에 실패했습니다')
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          className="gap-2 bg-green-500 hover:bg-green-600"
          disabled={isCompleting}
        >
          <CheckCircle2 className="h-4 w-4" />
          판매완료
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass">
        <AlertDialogHeader>
          <AlertDialogTitle>판매를 완료하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>이 채팅방의 구매자에게 물품이 판매되었음을 확인합니다.</p>
            <p className="text-yellow-500">
              ⚠️ 판매완료 처리 후에는 게시물 상태가 '판매완료'로 변경되며, 되돌릴 수 없습니다.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCompleting}>취소</AlertDialogCancel>
          <AlertDialogAction onClick={handleComplete} disabled={isCompleting}>
            {isCompleting ? '처리 중...' : '판매완료'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
