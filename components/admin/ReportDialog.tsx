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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  REPORT_REASONS,
  TARGET_TYPE_LABELS,
  type ReportReason,
  type ReportTargetType,
} from '@/types/admin'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: ReportTargetType
  targetId: string
}

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('신고 사유를 선택해주세요.')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('로그인이 필요합니다.')
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    })

    if (error) {
      toast.error('신고 접수에 실패했습니다.')
      console.error('Report error:', error)
    } else {
      toast.success('신고가 접수되었습니다.')
      onOpenChange(false)
      setReason('')
      setDetails('')
    }

    setIsSubmitting(false)
  }

  const handleClose = () => {
    onOpenChange(false)
    setReason('')
    setDetails('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>신고하기</DialogTitle>
          <DialogDescription>
            {TARGET_TYPE_LABELS[targetType]}을(를) 신고합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">신고 사유</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as ReportReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="사유를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(REPORT_REASONS) as [ReportReason, string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">상세 내용 (선택)</Label>
            <Textarea
              id="details"
              placeholder="추가로 전달할 내용이 있으면 작성해주세요."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '접수중...' : '신고하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
