'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('AppointmentCard')
import { formatDate } from '@/lib/utils/date'
import { Calendar, MapPin, MessageSquare, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { PurchaseAppointment } from '@/types/purchase'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AppointmentCardProps {
  appointment: PurchaseAppointment
  currentUserId: string
  onRespond?: (appointmentId: string, status: 'confirmed' | 'cancelled') => Promise<boolean>
  compact?: boolean
  className?: string
}

function formatRemainingTime(targetDate: Date) {
  const diffMs = targetDate.getTime() - Date.now()

  if (diffMs <= 0) return '약속 시간이 지났습니다'

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes < 60) {
    return `약속까지 ${diffMinutes}분`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `약속까지 ${diffHours}시간`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `약속까지 ${diffDays}일`
}

export function AppointmentCard({
  appointment,
  currentUserId,
  onRespond,
  compact = false,
  className,
}: AppointmentCardProps) {
  const [isResponding, setIsResponding] = useState(false)
  const isSeller = currentUserId === appointment.responder_id
  const appointmentDate = new Date(appointment.appointment_date)
  const remainingTimeLabel = formatRemainingTime(appointmentDate)

  const statusMeta = {
    proposed: {
      label: '응답 대기',
      badgeClassName: 'bg-amber-100 text-amber-700',
      helper: isSeller ? '구매자의 제안에 응답해주세요' : '판매자 응답 대기 중',
    },
    confirmed: {
      label: '약속 확정',
      badgeClassName: 'bg-emerald-100 text-emerald-700',
      helper: remainingTimeLabel,
    },
    cancelled: {
      label: '약속 취소',
      badgeClassName: 'bg-rose-100 text-rose-700',
      helper: '새 약속을 다시 제안할 수 있습니다',
    },
    completed: {
      label: '거래 완료',
      badgeClassName: 'bg-sky-100 text-sky-700',
      helper: '거래가 완료되었습니다',
    },
  }[appointment.status]

  // 약속 응답 처리
  async function handleRespond(status: 'confirmed' | 'cancelled') {
    if (!onRespond) return

    try {
      setIsResponding(true)
      await onRespond(appointment.id, status)
      toast.success(status === 'confirmed' ? '약속을 확정했어요' : '약속을 거절했어요')
    } catch (error) {
      logger.error('Respond error:', error)
      toast.error('약속 응답에 실패했습니다')
    } finally {
      setIsResponding(false)
    }
  }

  if (compact) {
    return (
      <div className={cn('mx-auto max-w-2xl', className)}>
        <div className="rounded-md border border-border bg-background/96 px-2 py-1.5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                <span>구매약속</span>
              </div>
              <p className="mt-0.5 truncate text-[13px] font-semibold">
                {formatDate(appointmentDate, 'M월 D일 (ddd) HH:mm')}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {appointment.location || '장소 협의 중'}
              </p>
              <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                {statusMeta.helper}
              </p>
            </div>
            <Badge className={cn('shrink-0 text-[10px] px-1.5 py-0.5', statusMeta.badgeClassName)}>
              {statusMeta.label}
            </Badge>
          </div>

          {appointment.memo && (
            <div className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
              {appointment.memo}
            </div>
          )}

          {isSeller && appointment.status === 'proposed' && onRespond && (
            <div className="mt-1.5 flex gap-1.5">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[30px] flex-1 text-[11px]"
                    disabled={isResponding}
                  >
                    거절하기
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass">
                  <AlertDialogHeader>
                    <AlertDialogTitle>약속을 거절하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      구매자의 약속 제안을 거절합니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRespond('cancelled')}>
                      거절하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-[30px] flex-1 bg-green-600 text-[11px] text-white hover:bg-green-700"
                    disabled={isResponding}
                  >
                    약속하기
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass">
                  <AlertDialogHeader>
                    <AlertDialogTitle>약속을 확정하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                      구매자의 약속 제안을 수락하고 거래 일정을 확정합니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRespond('confirmed')}>
                      약속하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {!isSeller && appointment.status === 'proposed' && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              판매자 응답 대기 중
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('my-4 mx-auto max-w-md', className)}>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="font-semibold">구매약속</span>
          </div>
          <Badge className={statusMeta.badgeClassName}>{statusMeta.label}</Badge>
        </div>

        <div className="mb-3 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          {statusMeta.helper}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">
                {formatDate(appointmentDate, 'YYYY년 M월 D일 (ddd)')}
              </div>
              <div className="text-muted-foreground">
                {formatDate(appointmentDate, 'HH:mm')}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>{appointment.location || '장소 협의 중'}</div>
          </div>

          {appointment.memo && (
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-muted-foreground whitespace-pre-wrap break-words">{appointment.memo}</div>
            </div>
          )}
        </div>

        {/* 판매자에게만 표시: 약속 응답 버튼 */}
        {isSeller && appointment.status === 'proposed' && onRespond && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={isResponding}
                >
                  거절하기
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass">
                <AlertDialogHeader>
                  <AlertDialogTitle>약속을 거절하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    구매자의 약속 제안을 거절합니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleRespond('cancelled')}>
                    거절하기
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isResponding}
                >
                  약속하기
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass">
                <AlertDialogHeader>
                  <AlertDialogTitle>약속을 확정하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    구매자의 약속 제안을 수락하고 거래 일정을 확정합니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleRespond('confirmed')}>
                    약속하기
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* 구매자에게 표시: 대기 메시지 */}
        {!isSeller && appointment.status === 'proposed' && (
          <div className="mt-3 pt-3 border-t border-border text-center text-sm text-muted-foreground">
            판매자의 응답을 기다리는 중입니다
          </div>
        )}
      </div>
    </div>
  )
}
