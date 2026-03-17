'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="flex justify-center">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">게시글을 불러올 수 없습니다</h2>
        <p className="text-sm text-muted-foreground">
          게시글이 삭제되었거나 접근할 수 없습니다.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()} className="flex-1">
            <ChevronLeft className="w-4 h-4 mr-1" />
            뒤로
          </Button>
          <Button onClick={reset} className="flex-1">
            다시 시도
          </Button>
        </div>
      </div>
    </div>
  )
}
