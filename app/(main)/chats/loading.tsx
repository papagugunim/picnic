export default function ChatsLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-2">
        {/* 스켈레톤 채팅방 목록 */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="glass-strong rounded-xl p-4 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
