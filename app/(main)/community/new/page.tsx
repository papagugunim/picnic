'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'

const categories = [
  { id: 'question', name: '질문', emoji: '❓' },
  { id: 'info', name: '정보', emoji: '💡' },
  { id: 'event', name: '이벤트', emoji: '🎉' },
  { id: 'chat', name: '잡담', emoji: '💬' },
  { id: 'lost_found', name: '분실물', emoji: '🔍' },
]

export default function NewCommunityPostPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('question')
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 입력 필드 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = ''

    if (images.length + files.length > 5) {
      setError('이미지는 최대 5개까지 업로드할 수 있습니다')
      setTimeout(() => setError(null), 3000)
      return
    }

    try {
      setIsUploadingImage(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('로그인이 필요합니다')
        return
      }

      const newImages: string[] = []
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // 파일 타입 검증
        if (!file.type.startsWith('image/')) {
          logger.error(`Invalid file type: ${file.type}`)
          errorCount++
          continue
        }

        // 파일 크기 검증
        if (file.size > 5 * 1024 * 1024) {
          logger.error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
          errorCount++
          continue
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}_${Date.now()}_${i}.${fileExt}`
        const filePath = `community/${fileName}`

        logger.log(`Uploading: ${fileName}`)

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          logger.error('Upload error:', uploadError)
          errorCount++
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(filePath)

        newImages.push(publicUrl)
        successCount++
        logger.log(`Upload success: ${publicUrl}`)
      }

      // 성공한 이미지만 추가
      if (newImages.length > 0) {
        const updatedImages = [...images, ...newImages]
        setImages(updatedImages)
        logger.log(`Total images after upload: ${updatedImages.length}`)
      }

      // 결과 피드백
      if (errorCount > 0 && successCount === 0) {
        setError(`이미지 업로드 실패: ${errorCount}개 (5MB 이하의 이미지 파일만 가능)`)
      } else if (errorCount > 0) {
        setError(`${successCount}개 업로드 성공, ${errorCount}개 실패`)
        setTimeout(() => setError(null), 3000)
      } else if (successCount > 0) {
        // 모두 성공 시 성공 메시지
        setError(`✅ ${successCount}개 사진 업로드 완료`)
        setTimeout(() => setError(null), 2000)
      }
    } catch (err) {
      logger.error('Image upload exception:', err)
      setError('이미지 업로드 중 오류가 발생했습니다')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const moveImageLeft = (index: number) => {
    if (index === 0) return
    const newImages = [...images]
    const temp = newImages[index]
    newImages[index] = newImages[index - 1]
    newImages[index - 1] = temp
    setImages(newImages)
  }

  const moveImageRight = (index: number) => {
    if (index === images.length - 1) return
    const newImages = [...images]
    const temp = newImages[index]
    newImages[index] = newImages[index + 1]
    newImages[index + 1] = temp
    setImages(newImages)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('제목을 입력해주세요')
      return
    }

    if (!content.trim()) {
      setError('내용을 입력해주세요')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인이 필요합니다')
        return
      }

      const { data, error: insertError } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          category: selectedCategory,
          images: images.length > 0 ? images : null,
        })
        .select()
        .single()

      if (insertError) {
        logger.error('Insert error:', insertError)
        setError('게시글 작성 중 오류가 발생했습니다')
        return
      }

      router.push(`/community/${data.id}`)
    } catch (err) {
      logger.error('Submit error:', err)
      setError('게시글 작성 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold">게시글 작성</h1>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? '작성 중...' : '완료'}
            </Button>
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

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              제목
            </label>
            <Input
              type="text"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {title.length}/100
            </p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-2">
              내용
            </label>
            <Textarea
              placeholder="이웃들에게 도움이 되는 정보를 공유해주세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {content.length}/2000
            </p>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium mb-2">
              사진 ({images.length}/5)
            </label>

            {images.length > 0 && (
              <div className="space-y-2 mb-3">
                <p className="text-xs text-muted-foreground">
                  📌 첫 번째 사진이 대표 이미지로 표시됩니다
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative aspect-square group">
                      {/* 순서 번호 */}
                      <div className="absolute top-2 left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold z-10">
                        {index + 1}
                      </div>

                      {/* 이미지 */}
                      <img
                        src={image}
                        alt={`이미지 ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border-2 border-border"
                        loading="lazy"
                      />

                      {/* 컨트롤 버튼들 */}
                      <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {/* 왼쪽으로 이동 */}
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => moveImageLeft(index)}
                            className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                            title="왼쪽으로 이동"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                        )}

                        {/* 오른쪽으로 이동 */}
                        {index < images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveImageRight(index)}
                            className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                            title="오른쪽으로 이동"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        )}

                        {/* 삭제 */}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          title="삭제"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {images.length < 5 && (
              <label
                htmlFor="image-upload"
                className={`flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg transition-colors ${
                  isUploadingImage
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:bg-muted/50'
                }`}
              >
                <div className="text-center">
                  {isUploadingImage ? (
                    <>
                      <div className="w-8 h-8 mx-auto mb-2 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        업로드 중...
                      </p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        사진 추가
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        갤러리 또는 카메라 (최대 5MB)
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Tips */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold mb-2 text-sm">💡 좋은 게시글 작성 팁</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 명확하고 구체적인 제목을 작성하세요</li>
              <li>• 이웃들에게 유용한 정보를 공유하세요</li>
              <li>• 사진을 첨부하면 더 이해하기 쉬워요</li>
              <li>• 좋아요를 많이 받으면 빵 굽기 점수가 올라가요!</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  )
}
