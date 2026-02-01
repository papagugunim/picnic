import { createServerClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/admin/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  PersonIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  RocketIcon,
} from '@radix-ui/react-icons'
import { REPORT_REASONS, TARGET_TYPE_LABELS, type ReportReason, type ReportTargetType } from '@/types/admin'

async function getAdminStats() {
  const supabase = await createServerClient()

  const [
    { count: totalUsers },
    { data: roleStats },
    { data: cityStats },
    { count: recentSignups },
    { count: suspendedUsers },
    { count: pendingReports },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('user_role'),
    supabase.from('profiles').select('city'),
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

  const usersByRole: Record<string, number> = {}
  roleStats?.forEach((r) => {
    const role = r.user_role || 'user'
    usersByRole[role] = (usersByRole[role] || 0) + 1
  })

  const usersByCity: Record<string, number> = {}
  cityStats?.forEach((c) => {
    if (c.city) {
      usersByCity[c.city] = (usersByCity[c.city] || 0) + 1
    }
  })

  return {
    totalUsers: totalUsers || 0,
    usersByRole,
    usersByCity,
    recentSignups: recentSignups || 0,
    suspendedUsers: suspendedUsers || 0,
    pendingReports: pendingReports || 0,
  }
}

async function getRecentUsers() {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, city, created_at')
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
      reason,
      status,
      created_at,
      reporter:reporter_id(full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  return data || []
}

export default async function AdminDashboardPage() {
  const [stats, recentUsers, recentReports] = await Promise.all([
    getAdminStats(),
    getRecentUsers(),
    getRecentReports(),
  ])

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">대시보드</h2>
        <p className="text-sm md:text-base text-muted-foreground">Picnic 서비스 현황을 한눈에 확인하세요.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-3">
        <StatsCard
          title="총 회원수"
          value={stats.totalUsers.toLocaleString()}
          icon={<PersonIcon className="h-4 w-4" />}
        />
        <StatsCard
          title="최근 7일 가입"
          value={stats.recentSignups.toLocaleString()}
          description="지난 7일간 신규 가입자"
          icon={<RocketIcon className="h-4 w-4" />}
        />
        <StatsCard
          title="정지된 계정"
          value={stats.suspendedUsers.toLocaleString()}
          icon={<LockClosedIcon className="h-4 w-4" />}
        />
        <StatsCard
          title="미처리 신고"
          value={stats.pendingReports.toLocaleString()}
          description="검토 대기중인 신고"
          icon={<ExclamationTriangleIcon className="h-4 w-4" />}
        />
        <StatsCard
          title="역할별 분포"
          value={`개발자 ${stats.usersByRole['developer'] || 0} / 관리자 ${stats.usersByRole['admin'] || 0}`}
          description={`일반 사용자 ${stats.usersByRole['user'] || 0}명`}
        />
        <StatsCard
          title="도시별 분포"
          value={`모스크바 ${stats.usersByCity['Moscow'] || 0} / 상트 ${stats.usersByCity['Saint Petersburg'] || 0}`}
        />
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-2">
            <CardTitle className="text-sm md:text-base">최근 가입 회원</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="space-y-3 md:space-y-4">
              {recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">최근 가입한 회원이 없습니다.</p>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 md:gap-3">
                    <Avatar className="h-7 w-7 md:h-8 md:w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{(user.full_name || '?').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium truncate">{user.full_name || '이름 없음'}</p>
                      <p className="text-xs text-muted-foreground">{user.city === 'Moscow' ? '모스크바' : user.city === 'Saint Petersburg' ? '상트' : '-'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-2">
            <CardTitle className="text-sm md:text-base">최근 신고</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="space-y-3 md:space-y-4">
              {recentReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">최근 신고가 없습니다.</p>
              ) : (
                recentReports.map((report) => {
                  const reporterData = report.reporter as { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null
                  const reporter = Array.isArray(reporterData) ? reporterData[0] : reporterData
                  return (
                    <div key={report.id} className="flex items-center gap-2 md:gap-3">
                      <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
                        <AvatarImage src={reporter?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{(reporter?.full_name || '?').slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm truncate">
                          <span className="font-medium">{reporter?.full_name || '알 수 없음'}</span>
                          <span className="text-muted-foreground hidden sm:inline">님이 </span>
                          <span className="text-muted-foreground sm:hidden"> · </span>
                          <span className="font-medium">{TARGET_TYPE_LABELS[report.target_type as ReportTargetType]}</span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {REPORT_REASONS[report.reason as ReportReason]}
                        </p>
                      </div>
                      <Badge
                        variant={report.status === 'pending' ? 'destructive' : 'secondary'}
                        className="text-xs flex-shrink-0"
                      >
                        {report.status === 'pending' ? '대기' : '처리'}
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
