export default function SearchLoading() {
  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-4 animate-pulse">
        {/* 검색창 스켈레톤 */}
        <div className="h-12 bg-muted rounded-xl mb-4" />

        {/* 결과 목록 스켈레톤 */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-strong rounded-xl p-3">
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-muted rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
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
