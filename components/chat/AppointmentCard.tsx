'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar, MapPin, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react'
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

interface AppointmentCardProps {
  appointment: PurchaseAppointment
  currentUserId: string
  onRespond?: (appointmentId: string, status: 'confirmed' | 'cancelled') => Promise<boolean>
}

export function AppointmentCard({
  appointment,
  currentUserId,
  onRespond
}: AppointmentCardProps) {
  const [isResponding, setIsResponding] = useState(false)
  const isSeller = currentUserId === appointment.responder_id
  const appointmentDate = new Date(appointment.appointment_date)

  // 상태별 배지
  const getStatusBadge = () => {
    switch (appointment.status) {
      case 'proposed':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />제안 대기중</Badge>
      case 'confirmed':
        return <Badge className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" />약속 확정</Badge>
      case 'cancelled':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />취소됨</Badge>
      case 'completed':
        return <Badge className="bg-blue-500 gap-1"><CheckCircle2 className="h-3 w-3" />거래 완료</Badge>
      default:
        return null
    }
  }

  // 약속 응답 처리
  async function handleRespond(status: 'confirmed' | 'cancelled') {
    if (!onRespond) return

    try {
      setIsResponding(true)
      await onRespond(appointment.id, status)
      toast.success(status === 'confirmed' ? '약속을 승인했습니다' : '약속을 거부했습니다')
    } catch (error) {
      console.error('Respond error:', error)
      toast.error('약속 응답에 실패했습니다')
    } finally {
      setIsResponding(false)
    }
  }

  return (
    <div className="my-4 mx-auto max-w-md">
      <div className="glass-strong rounded-lg p-4 border border-white/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="font-semibold">구매약속</span>
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-2 text-sm">
          {/* 날짜/시간 */}
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium">
                {format(appointmentDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}
              </div>
              <div className="text-gray-400">
                {format(appointmentDate, 'HH:mm')}
              </div>
            </div>
          </div>

          {/* 장소 */}
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
            <div>{appointment.location}</div>
          </div>

          {/* 메모 */}
          {appointment.memo && (
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="text-gray-300">{appointment.memo}</div>
            </div>
          )}
        </div>

        {/* 판매자에게만 표시: 승인/거부 버튼 */}
        {isSeller && appointment.status === 'proposed' && onRespond && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={isResponding}
                >
                  거부
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass">
                <AlertDialogHeader>
                  <AlertDialogTitle>약속을 거부하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    구매자의 약속 제안을 거부합니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleRespond('cancelled')}>
                    거부하기
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  disabled={isResponding}
                >
                  승인
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass">
                <AlertDialogHeader>
                  <AlertDialogTitle>약속을 승인하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    구매자의 약속 제안을 승인하고 거래 일정을 확정합니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleRespond('confirmed')}>
                    승인하기
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* 구매자에게 표시: 대기 메시지 */}
        {!isSeller && appointment.status === 'proposed' && (
          <div className="mt-3 pt-3 border-t border-white/10 text-center text-sm text-gray-400">
            판매자의 응답을 기다리는 중입니다
          </div>
        )}
      </div>
    </div>
  )
}
