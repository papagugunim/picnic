import NewPostForm from '@/components/post/NewPostForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewPostPage() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로 가기
          </Link>
          <h1 className="text-3xl font-bold">새 게시물 작성</h1>
          <p className="text-muted-foreground mt-2">
            판매하고 싶은 물건의 정보를 입력해주세요
          </p>
        </div>

        {/* 폼 */}
        <div className="glass-strong rounded-2xl p-6 md:p-8">
          <NewPostForm />
        </div>
      </div>
    </div>
  )
}
