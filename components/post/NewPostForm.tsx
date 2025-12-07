'use client'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ImageUpload from './ImageUpload'
import { createClient } from '@/lib/supabase/client'
import {
  CATEGORIES,
  TRADE_METHODS,
  MOSCOW_NEIGHBORHOODS,
  SPB_NEIGHBORHOODS,
} from '@/lib/constants'

const postSchema = z.object({
  title: z.string().min(2, '제목은 최소 2자 이상이어야 합니다').max(100, '제목은 최대 100자까지 가능합니다'),
  description: z.string().min(10, '설명은 최소 10자 이상이어야 합니다').max(2000, '설명은 최대 2000자까지 가능합니다'),
  price: z.string().refine(
    (val) => val === '' || !isNaN(Number(val)) && Number(val) >= 0,
    '올바른 가격을 입력해주세요'
  ),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  tradeMethod: z.array(z.string()).min(1, '거래 방법을 최소 1개 이상 선택해주세요'),
  city: z.string().min(1, '도시를 선택해주세요'),
  neighborhood: z.string().min(1, '지역을 선택해주세요'),
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
      tradeMethod: [],
      city: '',
      neighborhood: '',
    },
  })

  const selectedCity = form.watch('city')

  const neighborhoods = selectedCity === 'Moscow' ? MOSCOW_NEIGHBORHOODS : SPB_NEIGHBORHOODS

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

      // 임시 post ID 생성 (이미지 업로드용)
      const tempPostId = crypto.randomUUID()

      // 이미지 업로드
      let imageUrls: string[] = []
      if (images.length > 0) {
        imageUrls = await uploadImages(user.id, tempPostId)
      }

      // 게시물 생성
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          id: tempPostId,
          author_id: user.id,
          title: values.title,
          description: values.description,
          price: values.price ? parseInt(values.price) : null,
          category: values.category,
          images: imageUrls,
          city: values.city,
          neighborhood: values.neighborhood,
          trade_method: values.tradeMethod,
          status: 'active',
        })
        .select()
        .single()

      if (postError) {
        console.error('Post creation error:', postError)
        setError('게시물 작성 중 오류가 발생했습니다')
        return
      }

      // 성공! 게시물 상세 페이지로 이동
      router.push(`/post/${tempPostId}`)
      router.refresh()
    } catch (err) {
      console.error('Submission error:', err)
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

        {/* 가격 & 카테고리 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {...field}
                    className="glass"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>카테고리</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 거래 방법 (다중 선택) */}
        <FormField
          control={form.control}
          name="tradeMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>거래 방법</FormLabel>
              <div className="flex gap-4">
                {TRADE_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      value={method.value}
                      checked={field.value?.includes(method.value)}
                      onChange={(e) => {
                        const checked = e.target.checked
                        const value = e.target.value
                        if (checked) {
                          field.onChange([...field.value, value])
                        } else {
                          field.onChange(field.value.filter((v) => v !== value))
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{method.label}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 도시 & 지역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>도시</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value)
                    form.setValue('neighborhood', '') // 도시 변경 시 지역 초기화
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="도시 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Moscow">Moscow / 모스크바</SelectItem>
                    <SelectItem value="Saint Petersburg">Saint Petersburg / 상트페테르부르크</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>지역</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!selectedCity}
                >
                  <FormControl>
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="지역 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {neighborhoods.map((neighborhood) => (
                      <SelectItem key={neighborhood.value} value={neighborhood.value}>
                        {neighborhood.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
