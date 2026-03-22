'use client'

import { useState, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
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
  onRefreshNews: (forceRefresh?: boolean) => Promise<void> | void
}

export function NewsSection({ newsList, canManageNotices, onRefreshNews }: NewsSectionProps) {
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null)
  const [showNewsModal, setShowNewsModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showNewsForm, setShowNewsForm] = useState(false)
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [newsFormData, setNewsFormData] = useState({ content: '', summary: '' })
  const [isSavingNews, setIsSavingNews] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const buildTitleFromContent = useCallback((content: string) => {
    const normalized = content.replace(/\s+/g, ' ').trim()
    if (!normalized) return '공지 사항'
    const maxLength = 32
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized
  }, [])

  const openNewsModal = useCallback(
    (newsId?: string | null) => {
      if (newsList.length === 0) return

      const fallbackNewsId = newsList[0]?.id ?? null
      const requestedNewsId = newsId ?? fallbackNewsId
      const exists = requestedNewsId ? newsList.some((news) => news.id === requestedNewsId) : false

      setSelectedNewsId(exists ? requestedNewsId : fallbackNewsId)
      setShowNewsModal(true)
    },
    [newsList]
  )

  const handleNewsClick = useCallback((news: NewsItem) => {
    openNewsModal(news.id)
  }, [openNewsModal])

  const handleOpenNewsOverview = useCallback(() => {
    openNewsModal(selectedNewsId)
  }, [openNewsModal, selectedNewsId])

  const handleOpenManageModal = useCallback(() => {
    if (!canManageNotices) return
    setShowManageModal(true)
  }, [canManageNotices])

  const handleEditNews = useCallback((news: NewsItem) => {
    setEditingNews(news)
    setNewsFormData({
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
    if (!canManageNotices) {
      toast.error('공지 사항 삭제 권한이 없습니다')
      setDeleteTargetId(null)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', deleteTargetId)

      if (error) throw error

      const remainingNews = newsList.filter((news) => news.id !== deleteTargetId)
      const nextSelectedId = remainingNews[0]?.id ?? null

      if (nextSelectedId) {
        setSelectedNewsId(nextSelectedId)
        setShowNewsModal(true)
      } else {
        setShowNewsModal(false)
        setSelectedNewsId(null)
      }

      await onRefreshNews(true)
      toast.success('공지 사항이 삭제되었습니다')
    } catch (error) {
      logger.error('뉴스 삭제 실패:', error)
      const message = error instanceof Error ? error.message : '삭제에 실패했습니다'
      toast.error(message)
    } finally {
      setDeleteTargetId(null)
    }
  }, [deleteTargetId, canManageNotices, newsList, onRefreshNews])

  const selectedNews = selectedNewsId
    ? newsList.find((news) => news.id === selectedNewsId) ?? null
    : null

  const handleSaveNews = async () => {
    if (!newsFormData.content.trim()) return
    if (!canManageNotices) {
      toast.error('공지 사항 저장 권한이 없습니다')
      return
    }

    setIsSavingNews(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('로그인이 필요합니다')
        return
      }

      const normalizedContent = newsFormData.content.trim()
      const normalizedSummary = newsFormData.summary.trim()
      const newsData = {
        title: buildTitleFromContent(normalizedContent),
        content: normalizedContent,
        summary: normalizedSummary || normalizedContent.slice(0, 100) + '...',
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

      setNewsFormData({ content: '', summary: '' })
      setEditingNews(null)
      setShowNewsForm(false)
      await onRefreshNews(true)
      toast.success(editingNews ? '공지 사항이 수정되었습니다' : '공지 사항이 등록되었습니다')
    } catch (error) {
      logger.error('뉴스 저장 실패:', error)
      const message = error instanceof Error ? error.message : '저장에 실패했습니다'
      toast.error(message)
    } finally {
      setIsSavingNews(false)
    }
  }

  const handleOpenNewForm = useCallback(() => {
    setEditingNews(null)
    setNewsFormData({ content: '', summary: '' })
    setShowNewsForm(true)
  }, [])

  return (
    <>
      <div className="rounded-lg p-2.5">
        <NewsAutoSlide
          newsList={newsList}
          onNewsClick={handleNewsClick}
          canManageNotices={canManageNotices}
          onManageClick={handleOpenManageModal}
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

      {/* 공지 사항 관리 모달 (관리자/개발자 전용) */}
      {showManageModal && canManageNotices && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowManageModal(false)}
        >
          <div
            className="glass-strong rounded-xl max-w-2xl w-full max-h-[82vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <h2 className="text-base font-bold">공지 사항 관리</h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenNewForm}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-muted/50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  공지 추가
                </button>
                <button
                  type="button"
                  onClick={() => setShowManageModal(false)}
                  className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors"
                  aria-label="관리 모달 닫기"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-3 py-2">
              {newsList.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground mb-3">등록된 공지 사항이 없습니다</p>
                  <button
                    type="button"
                    onClick={handleOpenNewForm}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    첫 공지 등록
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {newsList.map((news) => (
                    <li
                      key={news.id}
                      className="rounded-lg border border-border/60 bg-background/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => openNewsModal(news.id)}
                          className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                        >
                          <p className="text-sm font-semibold line-clamp-1">{news.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {news.summary || news.content}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-2">
                            {new Date(news.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditNews(news)}
                            className="rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-muted/50 transition-colors"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNews(news.id)}
                            className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
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
                disabled={isSavingNews || !newsFormData.content.trim()}
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
