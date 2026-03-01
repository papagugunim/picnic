'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/contexts/UserContext'

/**
 * 관리자/개발자용 미처리 신고(pending) 개수 훅
 */
export function usePendingReportCount(enabled: boolean = true) {
  const [pendingReportCount, setPendingReportCount] = useState(0)
  const { user } = useUser()

  useEffect(() => {
    if (!enabled || !user) {
      setPendingReportCount(0)
      return
    }

    const supabase = createClient()
    let pollTimer: ReturnType<typeof setInterval> | null = null

    async function fetchPendingCount() {
      const { count, error } = await supabase
        .from('reports')
        .select('*', { head: true, count: 'exact' })
        .eq('status', 'pending')

      if (!error) {
        setPendingReportCount(count || 0)
      }
    }

    void fetchPendingCount()

    const channel = supabase
      .channel(`pending-report-count-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
        },
        () => {
          void fetchPendingCount()
        }
      )
      .subscribe()

    // 실시간 채널 누락 대비 백업 폴링
    pollTimer = setInterval(() => {
      void fetchPendingCount()
    }, 60_000)

    return () => {
      if (pollTimer) {
        clearInterval(pollTimer)
      }
      supabase.removeChannel(channel)
    }
  }, [enabled, user])

  return { pendingReportCount }
}
