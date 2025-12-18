export default function TodayLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header 스켈레톤 */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="px-4 py-4 space-y-2 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-8 bg-muted rounded w-40" />
              <div className="h-5 bg-muted rounded w-48" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-5 bg-muted rounded w-32" />
              <div className="h-5 bg-muted rounded w-40" />
            </div>
          </div>
        </div>

        {/* Content 스켈레톤 */}
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-strong rounded-xl p-4 animate-pulse">
              <div className="space-y-3">
                <div className="h-5 bg-muted rounded w-1/4" />
                <div className="h-24 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
