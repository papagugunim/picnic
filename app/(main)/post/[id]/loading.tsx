export default function PostDetailLoading() {
  return (
    <div className="bg-background">
      <div className="max-w-4xl mx-auto animate-pulse">
        {/* 이미지 */}
        <div className="w-full aspect-square bg-muted" />
        {/* 콘텐츠 */}
        <div className="px-4 py-4 space-y-3">
          {/* 작성자 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="space-y-1.5">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          </div>
          {/* 제목 */}
          <div className="h-6 bg-muted rounded w-3/4" />
          {/* 가격 */}
          <div className="h-7 bg-muted rounded w-1/4" />
          {/* 설명 */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}
