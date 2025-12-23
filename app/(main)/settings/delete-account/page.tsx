'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'

const deleteReasons = [
  { id: 'inconvenient', label: '서비스 이용이 불편해요' },
  { id: 'low_usage', label: '사용 빈도가 낮아요' },
  { id: 'other_service', label: '다른 서비스를 이용해요' },
  { id: 'privacy', label: '개인정보가 걱정돼요' },
  { id: 'other', label: '기타' },
]

export default function DeleteAccountPage() {
  const router = useRouter()
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [additionalFeedback, setAdditionalFeedback] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    if (!selectedReason) {
      setError('탈퇴 이유를 선택해주세요')
      return
    }

    if (!confirmChecked) {
      setError('탈퇴 확인을 체크해주세요')
      return
    }

    try {
      setIsDeleting(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인 정보를 찾을 수 없습니다')
        return
      }

      // 탈퇴 피드백 저장 (선택사항)
      await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          type: 'account_deletion',
          reason: selectedReason,
          feedback: additionalFeedback || null,
        })

      // 프로필 삭제 (soft delete)
      await supabase
        .from('profiles')
        .update({
          deleted_at: new Date().toISOString(),
          full_name: '탈퇴한 사용자',
          avatar_url: null,
        })
        .eq('id', user.id)

      // Auth 계정 완전 삭제 (재가입 가능하도록)
      const { error: deleteError } = await supabase.rpc('delete_user')

      if (deleteError) {
        console.error('Failed to delete auth user:', deleteError)
        // Auth 삭제 실패 시에도 로그아웃은 진행
      }

      // 로그아웃
      await supabase.auth.signOut()

      // 로그인 페이지로 리다이렉트
      router.push('/login?message=account_deleted')
    } catch (err) {
      console.error('Delete account error:', err)
      setError('회원 탈퇴 중 오류가 발생했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">회원 탈퇴</h1>
        </div>

        {/* Warning Message */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-2">
                회원 탈퇴 시 주의사항
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 회원정보 및 프로필이 삭제됩니다</li>
                <li>• 작성한 게시글과 댓글은 유지되지만 작성자가 "탈퇴한 사용자"로 표시됩니다</li>
                <li>• 채팅 내역은 유지되지만 프로필 정보는 삭제됩니다</li>
                <li>• 빵 굽기 레벨과 평가 정보가 모두 삭제됩니다</li>
                <li>• 탈퇴 후 재가입 시 기존 정보를 복구할 수 없습니다</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Delete Reason */}
        <div className="glass-strong rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold mb-4">
            탈퇴 이유를 알려주세요
          </h2>
          <div className="space-y-3">
            {deleteReasons.map((reason) => (
              <label
                key={reason.id}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <input
                  type="radio"
                  name="delete_reason"
                  value={reason.id}
                  checked={selectedReason === reason.id}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{reason.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Feedback */}
        <div className="glass-strong rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold mb-3">
            추가 의견 (선택사항)
          </h2>
          <Textarea
            placeholder="서비스 개선을 위한 의견을 자유롭게 작성해주세요"
            value={additionalFeedback}
            onChange={(e) => setAdditionalFeedback(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {additionalFeedback.length}/500
          </p>
        </div>

        {/* Final Confirmation */}
        <div className="glass-strong rounded-xl p-6 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="w-5 h-5 mt-0.5 flex-shrink-0"
            />
            <span className="text-sm">
              위 내용을 모두 확인했으며, 회원 탈퇴에 동의합니다.
              <br />
              <span className="text-destructive font-semibold">
                탈퇴 후에는 계정을 복구할 수 없습니다.
              </span>
            </span>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm font-medium text-center mb-4">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isDeleting}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={isDeleting || !selectedReason || !confirmChecked}
            className="flex-1"
          >
            {isDeleting ? '탈퇴 처리 중...' : '회원 탈퇴'}
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-center text-muted-foreground mt-6">
          탈퇴를 원하지 않으시면 취소 버튼을 눌러주세요
        </p>
      </div>
    </div>
  )
}
