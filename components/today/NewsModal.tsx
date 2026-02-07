'use client'

import { memo, useCallback } from 'react'
import { X, Edit2, Trash2 } from 'lucide-react'
import { NewsItem } from './types'

interface NewsModalProps {
  news: NewsItem
  isAdmin: boolean
  onClose: () => void
  onEdit: (news: NewsItem) => void
  onDelete: (newsId: string) => void
}

function NewsModalComponent({ news, isAdmin, onClose, onEdit, onDelete }: NewsModalProps) {
  // 배경 클릭 시 닫기
  const handleBackdropClick = useCallback(() => {
    onClose()
  }, [onClose])

  // 모달 내용 클릭 시 이벤트 전파 중단
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // 수정 클릭
  const handleEditClick = useCallback(() => {
    onEdit(news)
  }, [onEdit, news])

  // 삭제 클릭
  const handleDeleteClick = useCallback(() => {
    onDelete(news.id)
  }, [onDelete, news.id])

  // 날짜 포맷팅
  const formattedDate = new Date(news.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="glass-strong rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={handleContentClick}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold pr-8">{news.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors flex-shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
          <p className="whitespace-pre-wrap text-sm">{news.content}</p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <span>{formattedDate}</span>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={handleEditClick}
                className="p-1.5 hover:bg-background rounded-lg transition-colors"
                aria-label="수정"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteClick}
                className="p-1.5 hover:bg-background rounded-lg transition-colors text-destructive"
                aria-label="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const NewsModal = memo(NewsModalComponent)
