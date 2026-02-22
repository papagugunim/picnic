'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('NewPostForm')
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

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
import { UploadProgressButton } from './UploadProgressButton'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/constants'
import { cleanupUploadedPostImages, createClientId, uploadPostImagesWithRetry } from '@/lib/post-image-upload'

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
  const [freeLabel, setFreeLabel] = useState('무료나눔')
  const [freeBounce, setFreeBounce] = useState(false)
  const [confettiParticles, setConfettiParticles] = useState<{ id: number; emoji: string; x: number; y: number; delay: number }[]>([])
  const freeBtnRef = useRef<HTMLButtonElement>(null)
  const [submitProgress, setSubmitProgress] = useState(0)
  const [submitStatusText, setSubmitStatusText] = useState('🧺 준비 중')

  const triggerFreeEffect = useCallback(() => {
    // 바운스
    setFreeBounce(true)
    setTimeout(() => setFreeBounce(false), 600)

    // 컨페티
    const emojis = ['💛', '✨', '🎉', '😇', '⭐', '💖']
    const particles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: (Math.random() - 0.5) * 120,
      y: -(Math.random() * 60 + 20),
      delay: Math.random() * 0.2,
    }))
    setConfettiParticles(particles)
    setTimeout(() => setConfettiParticles([]), 1000)
  }, [])

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      description: '',
      price: '',
      category: '',
    },
  })

  async function onSubmit(values: PostFormValues) {
    const supabase = createClient()
    let uploadedImagePaths: string[] = []

    try {
      setIsLoading(true)
      setError(null)
      setSubmitProgress(6)
      setSubmitStatusText('🧺 준비 중')

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
      const tempPostId = createClientId()

      // 이미지 업로드
      let imageUrls: string[] = []
      if (images.length > 0) {
        setSubmitProgress(12)
        setSubmitStatusText(`📸 사진 업로드 0/${images.length}`)
        const uploadedImages = await uploadPostImagesWithRetry({
          supabase,
          userId: user.id,
          scope: 'post',
          entityId: tempPostId,
          files: images,
          onProgress: ({ uploaded, total }) => {
            const ratio = total > 0 ? uploaded / total : 0
            const nextProgress = Math.round(12 + ratio * 70)
            setSubmitProgress(Math.max(12, Math.min(82, nextProgress)))
            setSubmitStatusText(`📸 사진 업로드 ${uploaded}/${total}`)
          },
        })
        uploadedImagePaths = uploadedImages.map((item) => item.path)
        imageUrls = uploadedImages.map((item) => item.url)
      }

      setSubmitProgress(90)
      setSubmitStatusText('📝 글 저장 중')

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
        await cleanupUploadedPostImages(supabase, uploadedImagePaths)
        setError(`게시물 작성 중 오류가 발생했습니다: ${postError.message || JSON.stringify(postError)}`)
        return
      }

      // 성공! 게시물 상세 페이지로 이동
      setSubmitProgress(100)
      setSubmitStatusText('✅ 게시 완료!')
      await new Promise((resolve) => setTimeout(resolve, 700))
      router.push(`/post/${tempPostId}`)
      router.refresh()
    } catch (err) {
      logger.error('Submission error:', err)
      await cleanupUploadedPostImages(supabase, uploadedImagePaths)
      setError(err instanceof Error ? err.message : '게시물 작성 중 오류가 발생했습니다')
      setSubmitProgress(0)
      setSubmitStatusText('⚠️ 다시 시도')
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
                  onChange={(e) => {
                    field.onChange(e)
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                  }}
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
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
                <div className="flex gap-2 items-center">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    enterKeyHint="done"
                    autoComplete="off"
                    placeholder="가격을 입력하세요"
                    value={field.value ? Number(field.value).toLocaleString() : ''}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, '')
                      field.onChange(numericValue)
                    }}
                    className="flex-1"
                  />
                  <div className="relative">
                    <button
                      ref={freeBtnRef}
                      type="button"
                      onClick={() => {
                        const toFree = field.value !== '0'
                        field.onChange(toFree ? '0' : '')
                        if (toFree) {
                          setFreeLabel('당신은 천사')
                          triggerFreeEffect()
                          setTimeout(() => setFreeLabel('무료나눔'), 1500)
                        }
                      }}
                      className={`px-5 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                        freeBounce ? 'animate-free-bounce' : ''
                      } ${
                        field.value === '0'
                          ? 'bg-foreground text-background font-semibold'
                          : 'bg-secondary text-secondary-foreground hover:bg-muted'
                      }`}
                    >
                      {freeLabel}
                    </button>
                    {confettiParticles.map((p) => (
                      <span
                        key={p.id}
                        className="absolute pointer-events-none text-sm"
                        style={{
                          left: '50%',
                          top: '50%',
                          animation: `confetti-burst 0.8s ease-out ${p.delay}s forwards`,
                          ['--cx' as string]: `${p.x}px`,
                          ['--cy' as string]: `${p.y}px`,
                          opacity: 0,
                        }}
                      >
                        {p.emoji}
                      </span>
                    ))}
                  </div>
                </div>
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
        <UploadProgressButton
          type="submit"
          disabled={isLoading}
          isLoading={isLoading}
          progress={submitProgress}
          loadingText={submitStatusText}
          idleText="게시하기"
          className="w-full h-11 text-base"
        />
      </form>
    </Form>
  )
}
