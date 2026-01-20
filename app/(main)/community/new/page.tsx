'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

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
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    logger.log('handleImageUpload called, files:', files)

    if (!files || files.length === 0) {
      logger.log('No files selected')
      return
    }

    const newFiles = Array.from(files)
    logger.log('New files count:', newFiles.length)
    logger.log('Files info:', newFiles.map(f => ({ name: f.name, type: f.type, size: f.size })))

    // 입력 필드 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = ''

    // 파일 개수 검증
    if (images.length + newFiles.length > 5) {
      setError('이미지는 최대 5개까지 업로드할 수 있습니다')
      setTimeout(() => setError(null), 3000)
      return
    }

    // 파일 크기 및 타입 검증
    let errorCount = 0
    const validFiles: File[] = []

    for (const file of newFiles) {
      logger.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)

      // 파일 타입 검증 (확장자로도 체크)
      const isImageByType = file.type.startsWith('image/')
      const isImageByExt = /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name)

      if (!isImageByType && !isImageByExt) {
        logger.error(`Invalid file type: ${file.type}, name: ${file.name}`)
        errorCount++
        continue
      }

      // 파일 크기 검증 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        logger.error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
        errorCount++
        continue
      }

      logger.log(`File validated: ${file.name}`)
      validFiles.push(file)
    }

    logger.log('Valid files count:', validFiles.length)

    if (validFiles.length > 0) {
      setImages([...images, ...validFiles])
      setError(`✅ ${validFiles.length}개 사진 추가됨`)
      setTimeout(() => setError(null), 2000)
      logger.log('Images state updated, new length:', images.length + validFiles.length)
    }

    if (errorCount > 0) {
      setError(`${errorCount}개 파일 실패 (5MB 이하의 이미지 파일만 가능)`)
      setTimeout(() => setError(null), 3000)
    }
  }

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

  const removeImage = (index: number) => {
    const newFiles = images.filter((_, i) => i !== index)
    setImages(newFiles)
    setError(null)
  }

  const moveImageLeft = (index: number) => {
    if (index === 0) return
    const newFiles = [...images]
    const temp = newFiles[index]
    newFiles[index] = newFiles[index - 1]
    newFiles[index - 1] = temp
    setImages(newFiles)
  }

  const moveImageRight = (index: number) => {
    if (index === images.length - 1) return
    const newFiles = [...images]
    const temp = newFiles[index]
    newFiles[index] = newFiles[index + 1]
    newFiles[index + 1] = temp
    setImages(newFiles)
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

            {/* 업로드 영역 */}
            {images.length < 5 && (
              <label
                htmlFor="image-upload"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg transition-colors cursor-pointer hover:bg-muted/50 hover:border-primary/50 mb-4"
              >
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    사진 추가
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    갤러리 또는 카메라 (최대 5MB, 5개까지)
                  </p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* 업로드된 이미지 미리보기 */}
            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  📌 첫 번째 사진이 대표 이미지로 표시됩니다
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((file, index) => (
                    <div key={index} className="relative aspect-square group">
                      {/* 순서 번호 */}
                      <div className="absolute top-2 left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold z-10">
                        {index + 1}
                      </div>

                      {/* 삭제 버튼 (항상 표시) */}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10 shadow-lg"
                        title="삭제"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* 이미지 미리보기 */}
                      <div className="w-full h-full rounded-lg overflow-hidden border-2 border-border">
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`미리보기 ${index + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* 순서 변경 버튼들 (hover 시 표시) */}
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 안내 메시지 */}
            {images.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                {images.length}/5개 선택됨
                {images.length < 5 && ' • 추가 선택 가능'}
              </p>
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
