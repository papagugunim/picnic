'use client'

import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import EditPostForm from '@/components/post/EditPostForm'

export default function EditPostPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  return (
    <div className="bg-background">
      <div className="max-w-3xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex items-center gap-2 py-3">
          <button
            onClick={() => router.back()}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">게시물 수정</h1>
        </div>

        {/* 폼 */}
        <EditPostForm postId={postId} />
      </div>
    </div>
  )
}
