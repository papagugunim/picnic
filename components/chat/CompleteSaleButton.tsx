'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

interface CompleteSaleButtonProps {
  onReviewRequest: () => void
}

export function CompleteSaleButton({
  onReviewRequest
}: CompleteSaleButtonProps) {
  return (
    <Button
      size="sm"
      className="gap-2 bg-green-500 hover:bg-green-600"
      onClick={onReviewRequest}
    >
      <CheckCircle2 className="h-4 w-4" />
      판매완료
    </Button>
  )
}
