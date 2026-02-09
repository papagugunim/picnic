'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon, ExternalLinkIcon } from '@radix-ui/react-icons'
import { REPORT_REASONS, TARGET_TYPE_LABELS, type ReportReason, type ReportTargetType } from '@/types/admin'
import { formatTimeAgo } from '@/lib/utils/date'

interface ReportItem {
  id: string
  target_type: string
  target_id: string
  reason: string
  details: string | null
  status: string
  created_at: string
  reporter: { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null
}

function getTargetUrl(targetType: string, targetId: string): string | null {
  switch (targetType) {
    case 'post': return `/post/${targetId}`
    case 'community_post': return `/community/${targetId}`
    case 'user': return `/profile/${targetId}`
    default: return null
  }
}

export function RecentReports({ reports }: { reports: ReportItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader className="p-3 md:p-6 pb-2 md:pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base">최근 신고</CardTitle>
          <Link href="/admin/reports" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            전체보기
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">최근 신고가 없습니다.</p>
        ) : (
          <div className="divide-y">
            {reports.map((report) => {
              const reporterData = report.reporter
              const reporter = Array.isArray(reporterData) ? reporterData[0] : reporterData
              const isExpanded = expandedId === report.id
              const targetUrl = getTargetUrl(report.target_type, report.target_id)

              return (
                <div key={report.id} className="py-2.5 first:pt-0 last:pb-0">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    className="w-full flex items-center gap-2 md:gap-3 text-left hover:bg-muted/50 -mx-1.5 px-1.5 rounded-md transition-colors"
                  >
                    <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
                      <AvatarImage src={reporter?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{(reporter?.full_name || '?').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm truncate">
                        <span className="font-medium">{reporter?.full_name || '알 수 없음'}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span>{TARGET_TYPE_LABELS[report.target_type as ReportTargetType]}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {REPORT_REASONS[report.reason as ReportReason]}
                        <span className="hidden sm:inline"> · {formatTimeAgo(report.created_at)}</span>
                      </p>
                    </div>
                    <Badge
                      variant={report.status === 'pending' ? 'destructive' : 'secondary'}
                      className="text-xs flex-shrink-0"
                    >
                      {report.status === 'pending' ? '대기' : report.status === 'reviewed' ? '검토' : report.status === 'resolved' ? '처리' : '기각'}
                    </Badge>
                    <ChevronRightIcon className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="mt-2 ml-9 md:ml-11 space-y-2 pb-1">
                      {report.details && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                          {report.details}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatTimeAgo(report.created_at)}</span>
                        <span>·</span>
                        <span>{TARGET_TYPE_LABELS[report.target_type as ReportTargetType]}</span>
                      </div>
                      {targetUrl && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                          <Link href={targetUrl}>
                            <ExternalLinkIcon className="h-3 w-3 mr-1" />
                            {report.target_type === 'user' ? '프로필 보기' : '게시물 보기'}
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
