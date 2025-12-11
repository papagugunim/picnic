'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import ImageUpload from './ImageUpload'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/constants'

const postSchema = z.object({
  title: z.string().min(2, '제목은 최소 2자 이상이어야 합니다').max(100, '제목은 최대 100자까지 가능합니다'),
  description: z.string().min(10, '설명은 최소 10자 이상이어야 합니다').max(2000, '설명은 최대 2000자까지 가능합니다'),
  price: z.string().refine(
    (val) => val === '' || !isNaN(Number(val)) && Number(val) >= 0,
    '올바른 가격을 입력해주세요'
  ),
  category: z.string().min(1, '카테고리를 선택해주세요'),
})

type PostFormValues = z.infer<typeof postSchema>

interface EditPostFormProps {
  postId: string
}

export default function EditPostForm({ postId }: EditPostFormProps) {
  const router = useRouter()
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingPost, setIsFetchingPost] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      description: '',
      price: '',
      category: '',
    },
  })

  useEffect(() => {
    fetchPost()
  }, [postId])

  async function fetchPost() {
    try {
      setIsFetchingPost(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (postError || !post) {
        console.error('Post fetch error:', postError)
        setError('게시글을 불러올 수 없습니다')
        return
      }

      // Check if user is the author
      if (post.author_id !== user.id) {
        setError('게시글 작성자만 수정할 수 있습니다')
        return
      }

      // Set form values
      form.reset({
        title: post.title,
        description: post.description,
        price: post.price !== null ? String(post.price) : '',
        category: post.category,
      })

      // Set existing images
      if (post.images && post.images.length > 0) {
        setExistingImages(post.images)
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError('게시글을 불러오는 중 오류가 발생했습니다')
    } finally {
      setIsFetchingPost(false)
    }
  }

  async function uploadImages(userId: string): Promise<string[]> {
    const supabase = createClient()
    const imageUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${i}.${fileExt}`
      const filePath = `${userId}/${postId}/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('post-images')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Image upload error:', uploadError)
        throw new Error('이미지 업로드 중 오류가 발생했습니다')
      }

      // 공개 URL 생성
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      imageUrls.push(publicUrl)
    }

    return imageUrls
  }

  async function onSubmit(values: PostFormValues) {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()

      // 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인이 필요합니다')
        return
      }

      // 새 이미지 업로드
      let newImageUrls: string[] = []
      if (images.length > 0) {
        newImageUrls = await uploadImages(user.id)
      }

      // 기존 이미지와 새 이미지 합치기
      const allImages = [...existingImages, ...newImageUrls]

      // 게시물 업데이트
      const updateData = {
        title: values.title,
        description: values.description,
        price: values.price ? parseInt(values.price) : null,
        category: values.category,
        images: allImages,
      }

      console.log('Updating post data:', updateData)

      const { error: postError } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId)

      if (postError) {
        console.error('Post update error:', postError)
        setError(`게시물 수정 중 오류가 발생했습니다: ${postError.message}`)
        return
      }

      // 성공! 게시물 상세 페이지로 이동
      router.push(`/post/${postId}`)
      router.refresh()
    } catch (err) {
      console.error('Submission error:', err)
      setError(err instanceof Error ? err.message : '게시물 수정 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  if (isFetchingPost) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !form.formState.isDirty) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => router.back()}>돌아가기</Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 기존 이미지 */}
        {existingImages.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">
              현재 이미지
            </label>
            <div className="grid grid-cols-3 gap-3">
              {existingImages.map((url, index) => (
                <div key={url} className="relative aspect-square">
                  <img
                    src={url}
                    alt={`기존 이미지 ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 새 이미지 업로드 */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            이미지 추가 (최대 {5 - existingImages.length}장)
          </label>
          <ImageUpload
            value={images}
            onChange={setImages}
            maxFiles={5 - existingImages.length}
          />
        </div>

        {/* 제목 */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>제목</FormLabel>
              <FormControl>
                <Input
                  placeholder="판매할 물건의 제목을 입력하세요"
                  {...field}
                  className="glass"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 설명 */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명</FormLabel>
              <FormControl>
                <textarea
                  placeholder="물건의 상태, 구매 시기, 사용 횟수 등을 자세히 설명해주세요"
                  {...field}
                  className="glass w-full min-h-[150px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 가격 */}
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>가격 (루블)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="무료나눔은 0 또는 비워두세요"
                  value={field.value ? Number(field.value).toLocaleString() : ''}
                  onChange={(e) => {
                    // 숫자만 추출
                    const numericValue = e.target.value.replace(/[^0-9]/g, '')
                    field.onChange(numericValue)
                  }}
                  className="glass"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 카테고리 */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>카테고리</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => field.onChange(cat.value)}
                      className={`
                        px-4 py-3 rounded-lg border-2 transition-all
                        ${
                          field.value === cat.value
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border bg-background hover:border-primary/50'
                        }
                      `}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 에러 메시지 */}
        {error && (
          <div className="text-sm text-destructive p-3 glass-strong rounded-lg">
            {error}
          </div>
        )}

        {/* 제출 버튼 */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
            className="flex-1"
          >
            취소
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                수정 중...
              </>
            ) : (
              '수정하기'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
