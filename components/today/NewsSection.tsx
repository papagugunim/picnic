'use client'

import { useState, useCallback } from 'react'
import { Newspaper, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createNamespacedLogger } from '@/lib/logger'
import { NewsItem } from './types'
import { NewsAutoSlide } from './NewsAutoSlide'
import { NewsModal } from './NewsModal'
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
} from '@/components/ui/alert-dialog'

const logger = createNamespacedLogger('NewsSection')

interface NewsSectionProps {
  newsList: NewsItem[]
  canManageNotices: boolean
  onRefreshNews: () => void
}

export function NewsSection({ newsList, canManageNotices, onRefreshNews }: NewsSectionProps) {
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null)
  const [showNewsModal, setShowNewsModal] = useState(false)
  const [showNewsForm, setShowNewsForm] = useState(false)
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [newsFormData, setNewsFormData] = useState({ title: '', content: '', summary: '' })
  const [isSavingNews, setIsSavingNews] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const handleNewsClick = useCallback((news: NewsItem) => {
    setSelectedNewsId(news.id)
    setShowNewsModal(true)
  }, [])

  const handleEditNews = useCallback((news: NewsItem) => {
    setEditingNews(news)
    setNewsFormData({
      title: news.title,
      content: news.content,
      summary: news.summary || '',
    })
    setShowNewsModal(false)
    setShowNewsForm(true)
  }, [])

  const handleDeleteNews = useCallback((newsId: string) => {
    setDeleteTargetId(newsId)
  }, [])

  const confirmDeleteNews = useCallback(async () => {
    if (!deleteTargetId) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', deleteTargetId)

      if (error) throw error

      setShowNewsModal(false)
      setSelectedNewsId(null)
      onRefreshNews()
    } catch (error) {
      logger.error('뉴스 삭제 실패:', error)
      toast.error('삭제에 실패했습니다')
    } finally {
      setDeleteTargetId(null)
    }
  }, [deleteTargetId, onRefreshNews])

  const selectedNews = selectedNewsId
    ? newsList.find((news) => news.id === selectedNewsId) ?? null
    : null

  const handleSaveNews = async () => {
    if (!newsFormData.title.trim() || !newsFormData.content.trim()) return

    setIsSavingNews(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('로그인이 필요합니다')
        return
      }

      const newsData = {
        title: newsFormData.title.trim(),
        content: newsFormData.content.trim(),
        summary: newsFormData.summary.trim() || newsFormData.content.slice(0, 100) + '...',
        author_id: user.id,
        is_published: true,
      }

      if (editingNews) {
        const { error } = await supabase
          .from('news')
          .update(newsData)
          .eq('id', editingNews.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('news')
          .insert(newsData)
        if (error) throw error
      }

      setNewsFormData({ title: '', content: '', summary: '' })
      setEditingNews(null)
      setShowNewsForm(false)
      onRefreshNews()
    } catch (error) {
      logger.error('뉴스 저장 실패:', error)
      toast.error('저장에 실패했습니다')
    } finally {
      setIsSavingNews(false)
    }
  }

  const handleOpenNewForm = useCallback(() => {
    setEditingNews(null)
    setNewsFormData({ title: '', content: '', summary: '' })
    setShowNewsForm(true)
  }, [])

  return (
    <>
      <div className="glass-strong rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <h2 className="font-bold text-sm">공지 사항</h2>
          </div>
          {canManageNotices && (
            <button
              onClick={handleOpenNewForm}
              className="p-1.5 hover:bg-background rounded-lg transition-colors"
              aria-label="공지 사항 추가"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <NewsAutoSlide
          newsList={newsList}
          onNewsClick={handleNewsClick}
          canManageNotices={canManageNotices}
        />
      </div>

      {/* 뉴스 상세 모달 */}
      {showNewsModal && selectedNews && (
        <NewsModal
          newsList={newsList}
          initialNewsId={selectedNews.id}
          canManageNotices={canManageNotices}
          onClose={() => setShowNewsModal(false)}
          onEdit={handleEditNews}
          onDelete={handleDeleteNews}
        />
      )}

      {/* 뉴스 작성/수정 모달 */}
      {showNewsForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowNewsForm(false)}
        >
          <div
            className="glass-strong rounded-xl p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {editingNews ? '공지 사항 수정' : '새 공지 사항 작성'}
              </h2>
              <button
                onClick={() => setShowNewsForm(false)}
                className="p-2 hover:bg-background rounded-lg transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">제목</label>
                <input
                  type="text"
                  value={newsFormData.title}
                  onChange={(e) => setNewsFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="공지 사항 제목"
                  className="w-full p-3 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">내용</label>
                <textarea
                  value={newsFormData.content}
                  onChange={(e) => setNewsFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="공지 사항 내용을 입력하세요"
                  rows={6}
                  className="w-full p-3 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">요약 (선택)</label>
                <input
                  type="text"
                  value={newsFormData.summary}
                  onChange={(e) => setNewsFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="미리보기에 표시될 요약 (비워두면 자동 생성)"
                  className="w-full p-3 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                onClick={handleSaveNews}
                disabled={isSavingNews || !newsFormData.title.trim() || !newsFormData.content.trim()}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {isSavingNews ? '저장 중...' : (editingNews ? '수정하기' : '등록하기')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지 사항 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNews}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
