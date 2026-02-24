import { createServerClient } from '@/lib/supabase/server'
import FeedClient from '@/components/feed/FeedClient'
import type { Metadata } from 'next'
import type { ComponentProps } from 'react'

type InitialPost = ComponentProps<typeof FeedClient>['initialPosts'][number]

type RankedPostRow = {
  id: string
  author_id: string
  title: string
  price: number | null
  city: string
  neighborhood: string
  preferred_metro_stations: string[] | null
  created_at: string
  images: string[] | null
  status: string
  view_count: number | null
  author_full_name: string | null
  likes_count: number | null
  interests_count: number | null
  user_liked: boolean | null
  user_interested: boolean | null
  milk_boost_score: number | string | null
  milk_boost_until: string | null
}

export const metadata: Metadata = {
  title: '피드 | Picnic',
  description: '러시아 한인 중고거래 피드 - 내 주변의 중고 물품을 찾아보세요',
}

const PAGE_SIZE = 20

export default async function FeedPage() {
  const supabase = await createServerClient()

  // 서버에서 인증된 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || null

  // 서버에서 초기 게시글 목록 가져오기
  let initialPosts: InitialPost[] = []
  let initialCursor: string | null = null
  let initialCity: string | null = null

  if (userId) {
    // 사용자 프로필에서 city 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('city, user_role')
      .eq('id', userId)
      .single()
    initialCity = profile?.city || null
    const isAdminOrDeveloper = profile?.user_role === 'admin' || profile?.user_role === 'developer'

    const { data: postsData, error } = await supabase.rpc('get_ranked_posts', {
      p_city: profile?.city || null,
      p_limit: PAGE_SIZE,
      p_offset: 0,
      p_include_hidden: isAdminOrDeveloper,
    })

    if (error) {
      return (
        <FeedClient
          initialPosts={[]}
          initialCursor={null}
          initialCity={initialCity}
        />
      )
    }

    if (postsData && postsData.length > 0) {
      const normalizedPostsData = (postsData as RankedPostRow[]).map((post) => ({
        ...post,
        preferred_metro_stations: post.preferred_metro_stations || [],
        images: post.images || [],
        view_count: post.view_count || 0,
        likes_count: post.likes_count || 0,
        interests_count: post.interests_count || 0,
        user_liked: !!post.user_liked,
        user_interested: !!post.user_interested,
        milk_boost_score: Number(post.milk_boost_score || 0),
        milk_boost_until: post.milk_boost_until,
        profiles: {
          full_name: post.author_full_name || null,
        },
      })) as InitialPost[]

      initialPosts = normalizedPostsData

      if (normalizedPostsData.length === PAGE_SIZE) {
        initialCursor = String(PAGE_SIZE)
      }
    }
  }

  return (
    <FeedClient
      initialPosts={initialPosts}
      initialCursor={initialCursor}
      initialCity={initialCity}
    />
  )
}
