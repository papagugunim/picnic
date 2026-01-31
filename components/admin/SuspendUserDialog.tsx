'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { AdminProfile } from '@/types/admin'

interface SuspendUserDialogProps {
  user: AdminProfile
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuspend: (reason: string, expiresAt?: string) => Promise<{ success: boolean; error?: string }>
}

export function SuspendUserDialog({
  user,
  open,
  onOpenChange,
  onSuspend,
}: SuspendUserDialogProps) {
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState<string>('permanent')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getExpiresAt = () => {
    if (duration === 'permanent') return undefined

    const now = new Date()
    const days = parseInt(duration)
    now.setDate(now.getDate() + days)
    return now.toISOString()
  }

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('정지 사유를 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    const result = await onSuspend(reason, getExpiresAt())

    if (result.success) {
      toast.success(`${user.full_name || '사용자'}의 계정이 정지되었습니다.`)
      setReason('')
      setDuration('permanent')
    } else {
      toast.error(result.error || '계정 정지에 실패했습니다.')
    }

    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>계정 정지</DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{user.full_name || '사용자'}</span>의 계정을 정지합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">정지 사유</Label>
            <Textarea
              id="reason"
              placeholder="정지 사유를 입력하세요..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">정지 기간</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1일</SelectItem>
                <SelectItem value="3">3일</SelectItem>
                <SelectItem value="7">7일</SelectItem>
                <SelectItem value="14">14일</SelectItem>
                <SelectItem value="30">30일</SelectItem>
                <SelectItem value="90">90일</SelectItem>
                <SelectItem value="permanent">영구</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '처리중...' : '정지하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
