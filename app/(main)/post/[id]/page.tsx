import { createServerClient } from '@/lib/supabase/server'
import PostDetailClient from '@/components/post/PostDetailClient'
import type { Metadata } from 'next'
import type { ComponentProps } from 'react'
import { getCityNameInKorean } from '@/lib/constants'

interface PageProps {
  params: Promise<{ id: string }>
}

type PostDetailInitialPost = ComponentProps<typeof PostDetailClient>['initialPost']

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: post } = await supabase
    .from('posts')
    .select('title, description, price, city, images, is_hidden, status')
    .eq('id', id)
    .single()

  if (!post || post.is_hidden || post.status === 'hidden') {
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
  let currentUserRole: string | null = null

  if (userId) {
    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', userId)
      .maybeSingle()
    currentUserRole = viewerProfile?.user_role || null
  }

  let initialPost: PostDetailInitialPost = null
  let initialLikesCount = 0
  let initialInterestsCount = 0
  let initialUserLiked = false
  let initialUserInterested = false

  // 서버에서 게시글 상세 데이터 가져오기
  const { data: postData } = await supabase
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
    const isHiddenPost = Boolean(postData.is_hidden) || postData.status === 'hidden'
    const isDeveloper = currentUserRole === 'developer'
    if (isHiddenPost && !isDeveloper) {
      return (
        <PostDetailClient
          postId={postId}
          initialPost={null}
          initialLikesCount={0}
          initialInterestsCount={0}
          initialUserLiked={false}
          initialUserInterested={false}
        />
      )
    }

    // Extract author profile (Supabase returns it as array)
    const author = Array.isArray(postData.profiles)
      ? postData.profiles[0]
      : postData.profiles

    if (userId) {
      const [likesResult, interestsResult, userLikeResult, userInterestResult] = await Promise.all([
        supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
        supabase
          .from('post_interests')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
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
          .maybeSingle(),
      ])

      initialLikesCount = likesResult.count || 0
      initialInterestsCount = interestsResult.count || 0
      initialUserLiked = !!userLikeResult.data
      initialUserInterested = !!userInterestResult.data
    } else {
      const [likesResult, interestsResult] = await Promise.all([
        supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
        supabase
          .from('post_interests')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
      ])
      initialLikesCount = likesResult.count || 0
      initialInterestsCount = interestsResult.count || 0
    }

    initialPost = {
      ...postData,
      profiles: author,
      likes_count: initialLikesCount,
      interests_count: initialInterestsCount,
      user_liked: initialUserLiked,
      user_interested: initialUserInterested,
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
