import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RecentReports } from '@/components/admin/RecentReports'

async function getAdminStats() {
  const supabase = await createServerClient()

  const [
    { count: totalUsers },
    { count: recentSignups },
    { count: suspendedUsers },
    { count: pendingReports },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_suspended', true),
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  return {
    totalUsers: totalUsers || 0,
    recentSignups: recentSignups || 0,
    suspendedUsers: suspendedUsers || 0,
    pendingReports: pendingReports || 0,
  }
}

async function getRecentUsers() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, city, created_at, updated_at, post_count')
    .order('created_at', { ascending: false })
    .limit(5)

  return data || []
}

async function getRecentReports() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('reports')
    .select(`
      id,
      target_type,
      target_id,
      reason,
      details,
      status,
      created_at,
      reporter:reporter_id(full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  return data || []
}

function formatRelativeDate(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default async function AdminDashboardPage() {
  const [stats, recentUsers, recentReports] = await Promise.all([
    getAdminStats(),
    getRecentUsers(),
    getRecentReports(),
  ])

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">대시보드</h2>

      {/* Compact Stats */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <div className="rounded-lg bg-card p-2.5 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold">{stats.totalUsers}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">총 회원</p>
        </div>
        <div className="rounded-lg bg-card p-2.5 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold">{stats.recentSignups}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">7일 가입</p>
        </div>
        <div className="rounded-lg bg-card p-2.5 md:p-4 text-center">
          <p className="text-lg md:text-2xl font-bold">{stats.suspendedUsers}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">정지 계정</p>
        </div>
        <div className="rounded-lg bg-card p-2.5 md:p-4 text-center">
          <p className={`text-lg md:text-2xl font-bold ${stats.pendingReports > 0 ? 'text-destructive' : ''}`}>
            {stats.pendingReports}
          </p>
          <p className="text-[10px] md:text-xs text-muted-foreground">미처리 신고</p>
        </div>
      </div>

      {/* Recent Reports - TOP priority */}
      <RecentReports reports={recentReports} />

      {/* Recent Users */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2 md:pb-2">
          <CardTitle className="text-sm md:text-base">최근 가입 회원</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
          {recentUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">최근 가입한 회원이 없습니다.</p>
          ) : (
            <div className="divide-y">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-2 md:gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{(user.full_name || '?').slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium truncate">{user.full_name || '이름 없음'}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.city === 'Moscow' ? '모스크바' : user.city === 'Saint Petersburg' ? '상트' : '-'}
                      <span className="hidden sm:inline">
                        {' · '}게시글 {user.post_count ?? 0}개
                      </span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      가입 {formatRelativeDate(user.created_at)}
                    </p>
                    {user.updated_at && user.updated_at !== user.created_at && (
                      <p className="text-[10px] text-muted-foreground/70">
                        활동 {formatRelativeDate(user.updated_at)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
