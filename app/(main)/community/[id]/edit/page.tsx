'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('CommunityEditPage')
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import ImageUpload from '@/components/post/ImageUpload'

const categories = [
  { id: 'question', name: '질문', emoji: '❓' },
  { id: 'info', name: '정보', emoji: '💡' },
  { id: 'event', name: '이벤트', emoji: '🎉' },
  { id: 'chat', name: '잡담', emoji: '💬' },
  { id: 'lost_found', name: '분실물', emoji: '🔍' },
]

export default function EditCommunityPostPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('question')
  const [images, setImages] = useState<File[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPost()
  }, [postId])

  async function fetchPost() {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: post, error: fetchError } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (fetchError) {
        logger.error('Fetch error:', fetchError)
        setError('게시글을 불러올 수 없습니다')
        return
      }

      // 본인 게시글인지 확인
      if (post.user_id !== user.id) {
        setError('본인의 게시글만 수정할 수 있습니다')
        setTimeout(() => router.push(`/community/${postId}`), 2000)
        return
      }

      setTitle(post.title)
      setContent(post.content)
      setSelectedCategory(post.category)

      // 기존 이미지 URL 저장
      if (post.images && post.images.length > 0) {
        setExistingImageUrls(post.images)

        // URL을 File 객체로 변환 (미리보기용)
        const filePromises = post.images.map(async (url: string, index: number) => {
          try {
            const response = await fetch(url)
            const blob = await response.blob()
            const filename = url.split('/').pop() || `image-${index}.jpg`
            return new File([blob], filename, { type: blob.type })
          } catch (err) {
            logger.error('Failed to load image:', url, err)
            return null
          }
        })

        const files = await Promise.all(filePromises)
        const validFiles = files.filter((f): f is File => f !== null)
        setImages(validFiles)
      }
    } catch (err) {
      logger.error('Fetch error:', err)
      setError('게시글을 불러올 수 없습니다')
    } finally {
      setIsLoading(false)
    }
  }

  async function uploadImages(userId: string): Promise<string[]> {
    const supabase = createClient()
    const imageUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const file = images[i]

      // 기존 이미지인 경우 (URL로 시작하는 경우) 건너뛰기
      if (existingImageUrls.some(url => url.includes(file.name))) {
        const existingUrl = existingImageUrls.find(url => url.includes(file.name))
        if (existingUrl) {
          imageUrls.push(existingUrl)
          continue
        }
      }

      // 새 이미지 업로드
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}_${Date.now()}_${i}.${fileExt}`
      const filePath = `community/${fileName}`

      logger.log(`Uploading new image: ${fileName}`)

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

      logger.log('Updating post with data:', {
        title: title.trim(),
        content: content.trim(),
        category: selectedCategory,
        images: imageUrls.length > 0 ? imageUrls : null,
      })

      const { error: updateError } = await supabase
        .from('community_posts')
        .update({
          title: title.trim(),
          content: content.trim(),
          category: selectedCategory,
          images: imageUrls.length > 0 ? imageUrls : null,
        })
        .eq('id', postId)

      if (updateError) {
        logger.error('Update error:', updateError)
        setError(`게시글 수정 중 오류가 발생했습니다: ${updateError.message}`)
        return
      }

      logger.log('Post updated successfully')

      // 상세 페이지로 리다이렉트
      router.push(`/community/${postId}`)
      router.refresh()
    } catch (err) {
      logger.error('Submit error:', err)
      setError(err instanceof Error ? err.message : '게시글 수정 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">불러오는 중...</div>
      </div>
    )
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
              <h1 className="text-xl font-bold">게시글 수정</h1>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? '수정 중...' : '완료'}
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {error && (
            <div className="p-4 rounded-lg text-sm bg-destructive/10 text-destructive">
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
              사진 (최대 5개)
            </label>
            <ImageUpload value={images} onChange={setImages} maxFiles={5} />
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
