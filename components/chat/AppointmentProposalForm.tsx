'use client'

import { useState, useEffect } from 'react'
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
import { createClient } from '@/lib/supabase/client'
import { getMetroStationLabel } from '@/lib/metro-stations'

interface AppointmentProposalFormProps {
  roomId: string
  postId: string
  postAuthorId: string
  currentUserId: string
  otherUserId: string
  onPropose: (params: CreateAppointmentParams) => Promise<string>
}

export function AppointmentProposalForm({
  roomId,
  postId,
  postAuthorId,
  currentUserId,
  otherUserId,
  onPropose
}: AppointmentProposalFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preferredMetroStations, setPreferredMetroStations] = useState<string[]>([])
  const [formData, setFormData] = useState({
    date: '',
    location: '',
    memo: ''
  })

  // 판매자의 선호 지하철역 가져오기
  useEffect(() => {
    async function fetchPreferredStations() {
      const supabase = createClient()
      const { data } = await supabase
        .from('posts')
        .select('preferred_metro_stations')
        .eq('id', postId)
        .single()

      if (data && data.preferred_metro_stations) {
        setPreferredMetroStations(data.preferred_metro_stations)
      }
    }

    if (open) {
      fetchPreferredStations()
    }
  }, [open, postId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.date) {
      toast.error('날짜/시간을 입력해주세요')
      return
    }

    try {
      setIsSubmitting(true)

      await onPropose({
        room_id: roomId,
        post_id: postId,
        appointment_date: new Date(formData.date).toISOString(),
        location: formData.location.trim() || undefined,
        memo: formData.memo.trim() || undefined,
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
        <Button variant="outline" size="sm" className="w-full gap-2">
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
              <Label htmlFor="location">만날 장소 (선택)</Label>
              {preferredMetroStations.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground mb-2">판매자 추천 지하철역</p>
                  <div className="flex flex-wrap gap-2">
                    {preferredMetroStations.map((station) => (
                      <Button
                        key={station}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setFormData({ ...formData, location: getMetroStationLabel(station) })}
                      >
                        {getMetroStationLabel(station)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Input
                id="location"
                placeholder="지하철역 이름 입력 또는 위 추천역 선택"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="memo">추가 협의 사항 (선택)</Label>
              <Textarea
                id="memo"
                placeholder="예: 지하철역 안에 탑승 플랫폼 가운데 쪽에서 만나요
또는 지하철역 1번 출구 나와서 출구 앞에서 만나요"
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