'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ReportList } from '@/components/admin/ReportList'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReloadIcon } from '@radix-ui/react-icons'
import type { Report, ReportStatus, ReportTargetType } from '@/types/admin'

const PAGE_SIZE = 20

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ReportTargetType | 'all'>('all')

  const fetchReports = useCallback(async (reset = false) => {
    const supabase = createClient()
    setIsLoading(true)

    const currentPage = reset ? 0 : page
    const from = currentPage * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('reports')
      .select(`
        id,
        reporter_id,
        target_type,
        target_id,
        reason,
        details,
        status,
        reviewed_by,
        reviewed_at,
        action_taken,
        created_at,
        reporter:reporter_id(full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (typeFilter !== 'all') {
      query = query.eq('target_type', typeFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch reports:', error)
      setIsLoading(false)
      return
    }

    const newReports = (data || []).map((r) => ({
      ...r,
      reporter: r.reporter as { full_name: string | null; avatar_url: string | null } | null,
    })) as Report[]

    if (reset) {
      setReports(newReports)
      setPage(1)
    } else {
      setReports((prev) => [...prev, ...newReports])
      setPage((prev) => prev + 1)
    }

    setHasMore(newReports.length === PAGE_SIZE)
    setIsLoading(false)
  }, [page, statusFilter, typeFilter])

  useEffect(() => {
    fetchReports(true)
  }, [statusFilter, typeFilter])

  const handleUpdateStatus = useCallback(async (
    reportId: string,
    status: ReportStatus,
    actionTaken?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    const { error } = await supabase
      .from('reports')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        action_taken: actionTaken || null,
      })
      .eq('id', reportId)

    if (error) {
      return { success: false, error: error.message }
    }

    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status,
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
              action_taken: actionTaken || null,
            }
          : r
      )
    )

    return { success: true }
  }, [])

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchReports()
    }
  }, [isLoading, hasMore, fetchReports])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">신고 관리</h2>
        <p className="text-muted-foreground">사용자 신고를 검토하고 처리합니다.</p>
      </div>

      <div className="flex gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ReportStatus | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="pending">대기중</SelectItem>
            <SelectItem value="reviewed">검토완료</SelectItem>
            <SelectItem value="resolved">처리완료</SelectItem>
            <SelectItem value="dismissed">기각</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as ReportTargetType | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="대상 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 유형</SelectItem>
            <SelectItem value="user">사용자</SelectItem>
            <SelectItem value="post">중고거래 게시글</SelectItem>
            <SelectItem value="community_post">동네생활 게시글</SelectItem>
            <SelectItem value="comment">댓글</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && reports.length === 0 ? (
        <div className="flex justify-center py-12">
          <ReloadIcon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ReportList reports={reports} onUpdateStatus={handleUpdateStatus} />

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                    불러오는 중...
                  </>
                ) : (
                  '더 불러오기'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
