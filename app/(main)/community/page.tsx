import { createServerClient } from '@/lib/supabase/server'
import CommunityClient from './CommunityClient'
import type { CommunityPost } from '@/components/community/CommunityPostItem'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '동네생활 | Picnic',
  description: '러시아 한인 동네생활 커뮤니티 - 이웃들과 소통하세요',
}

const PAGE_SIZE = 20

type RankedCommunityPostRow = {
  id: string
  title: string
  content: string
  images: string[] | null
  category: string
  created_at: string
  user_id: string
  view_count: number | null
  author_full_name: string | null
  author_avatar_url: string | null
  author_bread_level: number | null
  author_city: string | null
  author_user_role: string | null
  likes_count: number | null
  comments_count: number | null
  is_liked: boolean | null
  milk_boost_score: number | string | null
  milk_boost_until: string | null
}

export default async function CommunityPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || null

  let initialPosts: CommunityPost[] = []
  let initialCursor: string | null = null

  if (userId) {
    // 사용자 프로필에서 city 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('city, user_role')
      .eq('id', userId)
      .single()

    const userCity = profile?.city || null

    const isAdminOrDeveloper = profile?.user_role === 'admin' || profile?.user_role === 'developer'

    const { data: postsData, error } = await supabase.rpc('get_ranked_community_posts', {
      p_city: userCity,
      p_limit: PAGE_SIZE,
      p_offset: 0,
      p_include_hidden: isAdminOrDeveloper,
    })

    if (!error && postsData && postsData.length > 0) {
      initialPosts = (postsData as RankedCommunityPostRow[]).map((post) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        images: post.images || [],
        category: post.category,
        created_at: post.created_at,
        user_id: post.user_id,
        view_count: post.view_count || 0,
        profiles: {
          full_name: post.author_full_name || null,
          avatar_url: post.author_avatar_url || null,
          bread_level: post.author_bread_level || 1,
          city: post.author_city || null,
          user_role: post.author_user_role || null,
        },
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        is_liked: !!post.is_liked,
        milk_boost_score: Number(post.milk_boost_score || 0),
        milk_boost_until: post.milk_boost_until,
      })) as CommunityPost[]

      if (initialPosts.length === PAGE_SIZE) {
        initialCursor = String(PAGE_SIZE)
      }
    }
  }

  return <CommunityClient initialPosts={initialPosts} initialCursor={initialCursor} />
}
