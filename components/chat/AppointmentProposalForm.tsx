'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from 'lucide-react'
import type { CreateAppointmentParams } from '@/types/purchase'
import { toast } from 'sonner'

interface AppointmentProposalFormProps {
  roomId: string
  postId: string
  currentUserId: string
  otherUserId: string
  onPropose: (params: CreateAppointmentParams) => Promise<string>
}

export function AppointmentProposalForm({
  roomId,
  postId,
  currentUserId,
  otherUserId,
  onPropose
}: AppointmentProposalFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    date: '',
    location: '',
    memo: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.date || !formData.location) {
      toast.error('날짜/시간과 만날 장소를 입력해주세요')
      return
    }

    try {
      setIsSubmitting(true)

      await onPropose({
        room_id: roomId,
        post_id: postId,
        appointment_date: new Date(formData.date).toISOString(),
        location: formData.location,
        memo: formData.memo || undefined,
        proposer_id: currentUserId,
        responder_id: otherUserId
      })

      toast.success('구매약속을 제안했습니다')
      setOpen(false)
      setFormData({ date: '', location: '', memo: '' })
    } catch (error) {
      console.error('Appointment proposal error:', error)
      toast.error('약속 제안에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          구매약속 잡기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] glass">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>구매약속 제안</DialogTitle>
            <DialogDescription>
              판매자와 만날 날짜, 시간, 장소를 입력해주세요
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">날짜와 시간 *</Label>
              <Input
                id="date"
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">만날 장소 *</Label>
              <Input
                id="location"
                placeholder="예: 강남역 2번 출구"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="memo">추가 메모 (선택)</Label>
              <Textarea
                id="memo"
                placeholder="특이사항이나 요청사항을 입력해주세요"
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '제안 중...' : '제안하기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
