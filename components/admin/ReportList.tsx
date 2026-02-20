'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { DotsHorizontalIcon, ExternalLinkIcon } from '@radix-ui/react-icons'
import { toast } from 'sonner'
import {
  REPORT_REASONS,
  REPORT_STATUS_LABELS,
  TARGET_TYPE_LABELS,
  type Report,
  type ReportReason,
  type ReportStatus,
  type ReportTargetType,
} from '@/types/admin'

interface ReportListProps {
  reports: Report[]
  onUpdateStatus: (
    reportId: string,
    status: ReportStatus,
    actionTaken?: string
  ) => Promise<{ success: boolean; error?: string }>
}

function getTargetUrl(targetType: ReportTargetType, targetId: string): string | null {
  switch (targetType) {
    case 'post':
      return `/post/${targetId}`
    case 'community_post':
      return `/community/${targetId}`
    case 'user':
      return `/profile/${targetId}`
    default:
      return null
  }
}

export function ReportList({ reports, onUpdateStatus }: ReportListProps) {
  const [actionDialogReport, setActionDialogReport] = useState<Report | null>(null)
  const [selectedAction, setSelectedAction] = useState<ReportStatus | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getStatusBadgeVariant = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return 'destructive'
      case 'reviewed':
        return 'secondary'
      case 'resolved':
        return 'default'
      case 'dismissed':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleAction = async (report: Report, status: ReportStatus) => {
    if (status === 'resolved') {
      setActionDialogReport(report)
      setSelectedAction(status)
      setActionNote('')
    } else {
      const result = await onUpdateStatus(report.id, status)
      if (result.success) {
        toast.success('신고가 처리되었습니다.')
      } else {
        toast.error(result.error || '처리에 실패했습니다.')
      }
    }
  }

  const handleSubmitAction = async () => {
    if (!actionDialogReport || !selectedAction) return

    setIsSubmitting(true)
    const result = await onUpdateStatus(
      actionDialogReport.id,
      selectedAction,
      actionNote || undefined
    )

    if (result.success) {
      toast.success('신고가 처리되었습니다.')
      setActionDialogReport(null)
      setSelectedAction(null)
      setActionNote('')
    } else {
      toast.error(result.error || '처리에 실패했습니다.')
    }

    setIsSubmitting(false)
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        신고 내역이 없습니다.
      </div>
    )
  }

  return (
    <>
      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-2">
        {reports.map((report) => {
          const targetUrl = getTargetUrl(report.target_type, report.target_id)
          return (
            <div key={report.id} className="bg-card border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={report.reporter?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(report.reporter?.full_name || '?').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {report.reporter?.full_name || '알 수 없음'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(report.created_at)}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={report.status !== 'pending'}
                    >
                      <DotsHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>처리</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAction(report, 'reviewed')}>
                      검토 완료
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction(report, 'resolved')}>
                      처리 완료
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAction(report, 'dismissed')}
                      className="text-muted-foreground"
                    >
                      기각
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {TARGET_TYPE_LABELS[report.target_type as ReportTargetType]}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(report.status as ReportStatus)} className="text-xs">
                    {REPORT_STATUS_LABELS[report.status as ReportStatus]}
                  </Badge>
                </div>
                {targetUrl && (
                  <Button variant="outline" size="sm" className="h-7 text-xs w-fit" asChild>
                    <Link href={targetUrl}>
                      <ExternalLinkIcon className="h-3 w-3 mr-1" />
                      {report.target_type === 'user' ? '프로필 보기' : '게시글 보기'}
                    </Link>
                  </Button>
                )}
                <p className="text-xs">
                  <span className="text-muted-foreground">사유: </span>
                  {REPORT_REASONS[report.reason as ReportReason]}
                </p>
                {report.details && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {report.details}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden md:block rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                신고자
              </th>
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                대상
              </th>
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                사유
              </th>
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                상태
              </th>
              <th className="h-10 px-4 text-left text-sm font-medium text-muted-foreground">
                신고일
              </th>
              <th className="h-10 px-4 text-right text-sm font-medium text-muted-foreground">
                액션
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-b hover:bg-muted/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={report.reporter?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(report.reporter?.full_name || '?').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {report.reporter?.full_name || '알 수 없음'}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col items-start gap-1.5">
                    <Badge variant="outline">
                      {TARGET_TYPE_LABELS[report.target_type as ReportTargetType]}
                    </Badge>
                    {(() => {
                      const targetUrl = getTargetUrl(report.target_type, report.target_id)
                      if (!targetUrl) return null

                      return (
                        <Link
                          href={targetUrl}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLinkIcon className="h-3 w-3" />
                          {report.target_type === 'user' ? '프로필 보기' : '게시글 보기'}
                        </Link>
                      )
                    })()}
                  </div>
                </td>
                <td className="p-4 text-sm">
                  {REPORT_REASONS[report.reason as ReportReason]}
                </td>
                <td className="p-4">
                  <Badge variant={getStatusBadgeVariant(report.status as ReportStatus)}>
                    {REPORT_STATUS_LABELS[report.status as ReportStatus]}
                  </Badge>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatDate(report.created_at)}
                </td>
                <td className="p-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={report.status !== 'pending'}
                      >
                        <DotsHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>처리</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleAction(report, 'reviewed')}>
                        검토 완료 (경고)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction(report, 'resolved')}>
                        처리 완료 (조치)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction(report, 'dismissed')}
                        className="text-muted-foreground"
                      >
                        기각 (허위 신고)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!actionDialogReport}
        onOpenChange={(open) => !open && setActionDialogReport(null)}
      >
        <DialogContent className="max-w-[90vw] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>신고 처리</DialogTitle>
            <DialogDescription>
              취한 조치 내용을 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>취한 조치</Label>
              <Textarea
                placeholder="예: 게시글 숨김 처리, 사용자에게 경고 메시지 전송 등"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setActionDialogReport(null)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button onClick={handleSubmitAction} disabled={isSubmitting}>
              {isSubmitting ? '처리중...' : '처리 완료'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
