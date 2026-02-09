'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import ImageUpload from '@/components/post/ImageUpload'

const categories = [
  { id: 'chat', name: '잡담', emoji: '💬' },
  { id: 'info', name: '정보', emoji: '💡' },
  { id: 'question', name: '질문', emoji: '❓' },
  { id: 'event', name: '이벤트', emoji: '🎉' },
  { id: 'lost_found', name: '분실물', emoji: '🔍' },
]

export default function NewCommunityPostPage() {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('chat')
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이미지 업로드 함수 (submit 시 호출)
  async function uploadImages(userId: string): Promise<string[]> {
    const supabase = createClient()
    const imageUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}_${Date.now()}_${i}.${fileExt}`
      const filePath = `community/${fileName}`

      logger.log(`Uploading: ${fileName}`)

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        logger.error('Upload error:', uploadError)
        throw new Error('이미지 업로드 중 오류가 발생했습니다')
      }

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      imageUrls.push(publicUrl)
      logger.log(`Upload success: ${publicUrl}`)
    }

    return imageUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError('내용을 입력해주세요')
      return
    }

    // 내용 첫 줄에서 제목 자동 생성
    const title = content.trim().split('\n')[0].slice(0, 50)

    try {
      setIsSubmitting(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인이 필요합니다')
        return
      }

      // 이미지 업로드 (있는 경우)
      let imageUrls: string[] = []
      if (images.length > 0) {
        try {
          imageUrls = await uploadImages(user.id)
        } catch (err) {
          logger.error('Image upload error:', err)
          setError('이미지 업로드 중 오류가 발생했습니다')
          return
        }
      }

      logger.log('Inserting post with data:', {
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        category: selectedCategory,
        images: imageUrls.length > 0 ? imageUrls : null,
      })

      const { data, error: insertError } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          category: selectedCategory,
          images: imageUrls.length > 0 ? imageUrls : null,
        })
        .select()
        .single()

      if (insertError) {
        logger.error('Insert error:', insertError)
        logger.error('Insert error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        })
        setError(`게시글 작성 중 오류가 발생했습니다: ${insertError.message}`)
        return
      }

      if (!data) {
        logger.error('No data returned after insert')
        setError('게시글이 작성되지 않았습니다')
        return
      }

      logger.log('Post created successfully:', data)

      // 동네생활 목록으로 리다이렉트
      router.push('/community')
      router.refresh()
    } catch (err) {
      logger.error('Submit error:', err)
      setError(err instanceof Error ? err.message : '게시글 작성 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-background">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-bold">글쓰기</h1>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {error && (
            <div className={`p-4 rounded-lg text-sm ${
              error.startsWith('✅')
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {error}
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              카테고리
            </label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-muted'
                  }`}
                >
                  <span className="mr-1">{category.emoji}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <Textarea
              placeholder="오늘 무슨 일 있었어요? 편하게 얘기해주세요 :)"
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              rows={10}
              maxLength={2000}
              className="text-base resize-none overflow-hidden"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {content.length}/2000
            </p>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium mb-2">
              사진 (최대 5개)
            </label>
            <ImageUpload value={images} onChange={setImages} maxFiles={5} />
          </div>

          {/* Tips */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold mb-2 text-sm">💬 이런 글도 좋아요</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 오늘 날씨 어때요? 같은 가벼운 수다</li>
              <li>• 맛집 발견! 같은 꿀팁 공유</li>
              <li>• 사진 한 장이면 분위기 200% UP</li>
              <li>• 좋아요 많이 받으면 빵 굽기 점수 UP!</li>
            </ul>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="w-full h-12 text-base"
          >
            {isSubmitting ? '올리는 중...' : '올리기'}
          </Button>
        </form>
      </div>
    </div>
  )
}
