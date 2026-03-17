export default function SettingsLoading() {
  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-4 animate-pulse">
        {/* 프로필 섹션 */}
        <div className="glass-strong rounded-xl p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        </div>

        {/* 테마 섹션 */}
        <div className="glass-strong rounded-xl p-4 mb-4 space-y-3">
          <div className="h-5 bg-muted rounded w-16" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 bg-muted rounded-full flex-1" />
            ))}
          </div>
        </div>

        {/* 도시 선택 섹션 */}
        <div className="glass-strong rounded-xl p-4 mb-4 space-y-3">
          <div className="h-5 bg-muted rounded w-20" />
          <div className="flex gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-muted rounded-xl flex-1" />
            ))}
          </div>
        </div>

        {/* 지하철역 섹션 */}
        <div className="glass-strong rounded-xl p-4 mb-4 space-y-3">
          <div className="h-5 bg-muted rounded w-24" />
          <div className="h-10 bg-muted rounded-xl" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-muted rounded-full w-24" />
            ))}
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="h-12 bg-muted rounded-xl" />
      </div>
    </div>
  )
}
