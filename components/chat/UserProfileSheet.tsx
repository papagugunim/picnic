'use client'

import { useEffect, useState } from 'react'
import { X, Star, Package, Calendar } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getBreadInfo, getBreadDescription, getBreadEmoji } from '@/lib/bread'

interface UserProfileSheetProps {
  userId: string
  userName: string | null
  avatarUrl: string | null
  breadLevel: number
  userRole?: string | null
  city?: string | null
  createdAt?: string | null
  postCount?: number | null
  onClose: () => void
}

interface ReviewStats {
  count: number
  avgRating: number
}

export function UserProfileSheet({
  userId,
  userName,
  avatarUrl,
  breadLevel,
  userRole,
  city,
  createdAt,
  postCount,
  onClose,
}: UserProfileSheetProps) {
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const avg = data.reduce((sum, r) => sum + (r.rating || 0), 0) / data.length
          setReviewStats({ count: data.length, avgRating: avg })
        } else {
          setReviewStats({ count: 0, avgRating: 0 })
        }
      })
  }, [userId])

  const breadInfo = getBreadInfo(breadLevel, userRole ?? undefined)
  const breadDesc = getBreadDescription(breadLevel, userRole ?? undefined)

  const joinedYear = createdAt
    ? new Date(createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
    : null

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* 바텀 시트 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background shadow-xl animate-in slide-in-from-bottom duration-200">
        {/* 핸들 */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="닫기"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="px-5 pt-2 pb-8">
          {/* 프로필 상단 */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName || '사용자'}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
                {userName?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold">{userName || '익명'}</span>
                <span className="text-lg">{getBreadEmoji(breadLevel, userRole ?? undefined)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${breadInfo.color}30`, color: breadInfo.color }}
                >
                  {breadInfo.name}
                </span>
                <span className="text-xs text-muted-foreground">{breadDesc}</span>
              </div>
              {city && (
                <p className="text-xs text-muted-foreground mt-0.5">{city}</p>
              )}
            </div>
          </div>

          {/* 통계 */}
          <div className="flex items-center divide-x divide-border py-4">
            {/* 거래 후기 */}
            <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-base font-bold">
                  {reviewStats
                    ? reviewStats.count > 0
                      ? reviewStats.avgRating.toFixed(1)
                      : '-'
                    : '…'}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {reviewStats
                  ? reviewStats.count > 0
                    ? `거래 후기 ${reviewStats.count}개`
                    : '후기 없음'
                  : '로딩 중'}
              </span>
            </div>

            {/* 등록 게시글 */}
            <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
              <div className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-base font-bold">{postCount ?? '-'}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">등록 게시글</span>
            </div>

            {/* 가입일 */}
            {joinedYear && (
              <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{joinedYear}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">가입</span>
              </div>
            )}
          </div>

          {/* 전체 프로필 보기 */}
          <Link
            href={`/profile/${userId}`}
            onClick={onClose}
            className="flex items-center justify-center w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            프로필 전체 보기
          </Link>
        </div>
      </div>
    </>
  )
}
