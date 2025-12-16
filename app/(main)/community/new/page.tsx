'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Image as ImageIcon, X } from 'lucide-react'
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
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (images.length + files.length > 5) {
      setError('이미지는 최대 5개까지 업로드할 수 있습니다')
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newImages: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드할 수 있습니다')
        continue
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('파일 크기는 5MB 이하여야 합니다')
        continue
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}_${Date.now()}_${i}.${fileExt}`
      const filePath = `community/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setError('이미지 업로드 중 오류가 발생했습니다')
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

      newImages.push(publicUrl)
    }

    setImages([...images, ...newImages])
    setError(null)
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
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
        console.error('Insert error:', insertError)
        setError('게시글 작성 중 오류가 발생했습니다')
        return
      }

      router.push(`/community/${data.id}`)
    } catch (err) {
      console.error('Submit error:', err)
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
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
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
              사진 (선택, 최대 5개)
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={image}
                      alt={`이미지 ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < 5 && (
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    사진 추가
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
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
