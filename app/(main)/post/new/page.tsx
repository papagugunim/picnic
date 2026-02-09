import NewPostForm from '@/components/post/NewPostForm'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewPostPage() {
  return (
    <div className="bg-background">
      <div className="max-w-3xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex items-center gap-2 py-3">
          <Link
            href="/feed"
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">게시물 작성</h1>
        </div>

        {/* 폼 */}
        <NewPostForm />
      </div>
    </div>
  )
}
