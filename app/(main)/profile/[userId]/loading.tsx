export default function ProfileLoading() {
  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* 프로필 헤더 스켈레톤 */}
        <div className="px-4 pt-6 pb-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-muted rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
          {/* 빵 레벨 */}
          <div className="mt-4 h-12 bg-muted rounded-xl" />
          {/* 통계 */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-xl" />
            ))}
          </div>
        </div>

        {/* 탭 스켈레톤 */}
        <div className="px-4 animate-pulse">
          <div className="flex gap-2 border-b border-border pb-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted rounded-t w-16" />
            ))}
          </div>
        </div>

        {/* 게시글 목록 스켈레톤 */}
        <div className="p-4 space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-strong rounded-xl p-3">
              <div className="flex gap-3">
                <div className="w-20 h-20 bg-muted rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-5 bg-muted rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
