'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('NewPostForm')
import { useState } from 'react'
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

export default function NewPostForm() {
  const router = useRouter()
  const [images, setImages] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
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

  async function uploadImages(userId: string, postId: string): Promise<string[]> {
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
        logger.error('Image upload error:', uploadError)
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

      // 사용자 프로필에서 도시와 지하철역 정보 가져오기
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('city, preferred_metro_stations')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setError('프로필 정보를 가져올 수 없습니다')
        return
      }

      if (!profile.city) {
        setError('설정에서 도시를 먼저 선택해주세요')
        return
      }

      // 임시 post ID 생성 (이미지 업로드용)
      const tempPostId = crypto.randomUUID()

      // 이미지 업로드
      let imageUrls: string[] = []
      if (images.length > 0) {
        imageUrls = await uploadImages(user.id, tempPostId)
      }

      // 게시물 생성
      const postData = {
        id: tempPostId,
        author_id: user.id,
        title: values.title,
        description: values.description,
        price: values.price ? parseInt(values.price) : null,
        category: values.category,
        images: imageUrls,
        city: profile.city,
        neighborhood: profile.city,
        preferred_metro_stations: profile.preferred_metro_stations || [],
        trade_method: [],
        status: 'active',
      }

      logger.log('Inserting post data:', postData)

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single()

      if (postError) {
        logger.error('Post creation error:', postError)
        setError(`게시물 작성 중 오류가 발생했습니다: ${postError.message || JSON.stringify(postError)}`)
        return
      }

      // 성공! 게시물 상세 페이지로 이동
      router.push(`/post/${tempPostId}`)
      router.refresh()
    } catch (err) {
      logger.error('Submission error:', err)
      setError(err instanceof Error ? err.message : '게시물 작성 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-8">
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
                  placeholder="물건의 상태, 구매 시기 등을 설명해주세요"
                  {...field}
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 사진 */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            사진 (최대 5장)
          </label>
          <ImageUpload value={images} onChange={setImages} maxFiles={5} />
        </div>

        {/* 가격 */}
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>가격 (₽)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="무료나눔은 0 또는 비워두세요"
                  value={field.value ? Number(field.value).toLocaleString() : ''}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '')
                    field.onChange(numericValue)
                  }}
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
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => field.onChange(cat.value)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        field.value === cat.value
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-secondary text-secondary-foreground hover:bg-muted'
                      }`}
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
          <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-lg">
            {error}
          </div>
        )}

        {/* 제출 버튼 */}
        <Button type="submit" disabled={isLoading} className="w-full h-11 text-base">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              게시 중...
            </>
          ) : (
            '게시하기'
          )}
        </Button>
      </form>
    </Form>
  )
}
