import { createServerClient } from '@/lib/supabase/server'
import FeedClient from '@/components/feed/FeedClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '피드 | Picnic',
  description: '러시아 한인 중고거래 피드 - 내 주변의 중고 물품을 찾아보세요',
}

export default async function FeedPage() {
  const supabase = await createServerClient()

  // 서버에서 인증된 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || null

  // 서버에서 초기 게시글 목록 가져오기
  let initialPosts: any[] = []
  let initialCursor: string | null = null
  let initialCity: string | null = null

  if (userId) {
    // 사용자 프로필에서 city 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('city')
      .eq('id', userId)
      .single()
    initialCity = profile?.city || null

    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        price,
        city,
        neighborhood,
        preferred_metro_stations,
        created_at,
        images,
        status,
        view_count,
        profiles:author_id (
          full_name
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20)

    if (profile?.city) {
      query = query.eq('city', profile.city)
    }

    const { data: postsData } = await query

    if (postsData && postsData.length > 0) {
      const postIds = postsData.map((p: any) => p.id)

      const [likesResult, interestsResult] = await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id, user_id')
          .in('post_id', postIds),
        supabase
          .from('post_interests')
          .select('post_id, user_id')
          .in('post_id', postIds)
      ])

      const likesData = likesResult.data || []
      const interestsData = interestsResult.data || []

      const likesCountMap = new Map<string, number>()
      const interestsCountMap = new Map<string, number>()
      const userLikesSet = new Set<string>()
      const userInterestsSet = new Set<string>()

      likesData.forEach(like => {
        likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1)
        if (like.user_id === userId) {
          userLikesSet.add(like.post_id)
        }
      })

      interestsData.forEach(interest => {
        interestsCountMap.set(interest.post_id, (interestsCountMap.get(interest.post_id) || 0) + 1)
        if (interest.user_id === userId) {
          userInterestsSet.add(interest.post_id)
        }
      })

      initialPosts = postsData.map((post: any) => ({
        ...post,
        likes_count: likesCountMap.get(post.id) || 0,
        interests_count: interestsCountMap.get(post.id) || 0,
        user_liked: userLikesSet.has(post.id),
        user_interested: userInterestsSet.has(post.id),
      }))

      if (postsData.length === 20) {
        initialCursor = postsData[postsData.length - 1].created_at
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
