export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        {/* 스켈레톤 게시글들 */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="glass-strong rounded-xl p-4 animate-pulse"
          >
            <div className="space-y-3">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-20 bg-muted rounded" />
              <div className="flex gap-2">
                <div className="h-8 bg-muted rounded w-16" />
                <div className="h-8 bg-muted rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
