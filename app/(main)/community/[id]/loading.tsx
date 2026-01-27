export default function CommunityDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-4 animate-pulse">
        {/* 작성자 정보 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-muted rounded-full" />
          <div className="space-y-1.5">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-3 bg-muted rounded w-16" />
          </div>
        </div>
        {/* 제목 */}
        <div className="h-6 bg-muted rounded w-3/4 mb-3" />
        {/* 본문 */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
        {/* 이미지 */}
        <div className="h-48 bg-muted rounded-lg mb-4" />
        {/* 액션 */}
        <div className="flex gap-4">
          <div className="h-8 bg-muted rounded w-16" />
          <div className="h-8 bg-muted rounded w-16" />
        </div>
      </div>
    </div>
  )
}
