import { createServerClient } from '@/lib/supabase/server'
import CommunityClient from './CommunityClient'
import type { CommunityPost } from '@/components/community/CommunityPostItem'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '동네생활 | Picnic',
  description: '러시아 한인 동네생활 커뮤니티 - 이웃들과 소통하세요',
}

const PAGE_SIZE = 20

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
      .select('city')
      .eq('id', userId)
      .single()

    const userCity = profile?.city || null

    // 게시글 가져오기
    const { data: postsData } = await supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        images,
        category,
        created_at,
        user_id,
        view_count,
        profiles!community_posts_user_id_fkey (
          full_name,
          avatar_url,
          bread_level,
          city,
          user_role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    // 도시 기준 필터링
    const filteredByCity = userCity
      ? (postsData || []).filter((post: any) => {
          const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
          return author?.city === userCity
        })
      : postsData

    const postIds = (filteredByCity || []).map((p: any) => p.id)

    if (postIds.length > 0) {
      // 좋아요, 댓글 수를 병렬로 가져오기
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from('community_likes')
          .select('post_id, user_id')
          .in('post_id', postIds),
        supabase
          .from('community_comments')
          .select('post_id')
          .in('post_id', postIds)
      ])

      const likesData = likesResult.data || []
      const commentsData = commentsResult.data || []

      const likesCountMap = new Map<string, number>()
      const userLikesSet = new Set<string>()

      likesData.forEach((like: any) => {
        likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1)
        if (like.user_id === userId) {
          userLikesSet.add(like.post_id)
        }
      })

      const commentsCountMap = new Map<string, number>()
      commentsData.forEach((comment: any) => {
        commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1)
      })

      initialPosts = (filteredByCity || []).map((post: any) => {
        const postAuthor = Array.isArray(post.profiles)
          ? post.profiles[0]
          : post.profiles

        return {
          ...post,
          profiles: postAuthor,
          likes_count: likesCountMap.get(post.id) || 0,
          comments_count: commentsCountMap.get(post.id) || 0,
          is_liked: userLikesSet.has(post.id),
        }
      }) as CommunityPost[]

      // 다음 페이지 커서 설정
      if (postsData && postsData.length === PAGE_SIZE) {
        initialCursor = postsData[postsData.length - 1].created_at
      }
    }
  }

  return <CommunityClient initialPosts={initialPosts} initialCursor={initialCursor} />
}
