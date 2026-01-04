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
        neighborhood: profile.city, // 일단 city를 neighborhood에도 저장
        preferred_metro_stations: profile.preferred_metro_stations || [], // 프로필의 지하철역 정보 저장
        trade_method: [], // 빈 배열로 설정
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
        logger.error('Error details:', JSON.stringify(postError, null, 2))
        logger.error('Error message:', postError.message)
        logger.error('Error code:', postError.code)
        logger.error('Error hint:', postError.hint)
        logger.error('Error details:', postError.details)
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 이미지 업로드 */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            이미지 (최대 5장)
          </label>
          <ImageUpload value={images} onChange={setImages} maxFiles={5} />
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
                게시 중...
              </>
            ) : (
              '게시하기'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
