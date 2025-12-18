export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* 스켈레톤 카드들 */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-strong rounded-xl p-4 animate-pulse"
          >
            <div className="h-48 bg-muted rounded-lg mb-4" />
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
