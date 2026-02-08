import { createServerClient } from '@/lib/supabase/server'
import PostDetailClient from '@/components/post/PostDetailClient'
import type { Metadata } from 'next'
import { getCityNameInKorean } from '@/lib/constants'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: post } = await supabase
    .from('posts')
    .select('title, description, price, city, images')
    .eq('id', id)
    .single()

  if (!post) {
    return {
      title: '게시글을 찾을 수 없습니다 | Picnic',
    }
  }

  const priceText = post.price === 0 || post.price === null
    ? '무료나눔'
    : `${post.price.toLocaleString()}₽`

  const description = post.description
    ? post.description.slice(0, 160)
    : `${getCityNameInKorean(post.city)} - ${priceText}`

  return {
    title: `${post.title} | Picnic`,
    description,
    openGraph: {
      title: post.title,
      description,
      images: post.images && post.images.length > 0
        ? [{ url: post.images[0] }]
        : undefined,
    },
  }
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id: postId } = await params
  const supabase = await createServerClient()

  // 서버에서 인증된 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || null

  let initialPost: any = null
  let initialLikesCount = 0
  let initialInterestsCount = 0
  let initialUserLiked = false
  let initialUserInterested = false

  // 서버에서 게시글 상세 데이터 가져오기
  const { data: postData, error: postError } = await supabase
    .from('posts')
    .select(`
      id,
      author_id,
      title,
      description,
      price,
      category,
      images,
      city,
      neighborhood,
      preferred_metro_stations,
      trade_method,
      status,
      created_at,
      is_hidden,
      hidden_at,
      hidden_by,
      view_count,
      profiles!posts_author_id_fkey (
        full_name,
        avatar_url,
        bread_level,
        user_role
      )
    `)
    .eq('id', postId)
    .single()

  if (postData) {
    // Extract author profile (Supabase returns it as array)
    const author = Array.isArray(postData.profiles)
      ? postData.profiles[0]
      : postData.profiles

    initialPost = {
      ...postData,
      profiles: author,
    }

    // 좋아요, 관심 수 및 사용자 상태를 병렬로 가져오기
    const queries: PromiseLike<any>[] = [
      supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId),
      supabase
        .from('post_interests')
        .select('id')
        .eq('post_id', postId),
    ]

    if (userId) {
      queries.push(
        supabase
          .from('post_likes')
          .select('id')
          .eq('user_id', userId)
          .eq('post_id', postId)
          .maybeSingle(),
        supabase
          .from('post_interests')
          .select('id')
          .eq('user_id', userId)
          .eq('post_id', postId)
          .maybeSingle()
      )
    }

    const results = await Promise.all(queries)

    initialLikesCount = results[0].data?.length || 0
    initialInterestsCount = results[1].data?.length || 0

    if (userId) {
      initialUserLiked = !!results[2]?.data
      initialUserInterested = !!results[3]?.data
    }
  }

  return (
    <PostDetailClient
      postId={postId}
      initialPost={initialPost}
      initialLikesCount={initialLikesCount}
      initialInterestsCount={initialInterestsCount}
      initialUserLiked={initialUserLiked}
      initialUserInterested={initialUserInterested}
    />
  )
}
