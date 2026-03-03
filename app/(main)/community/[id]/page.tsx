import { createServerClient } from '@/lib/supabase/server'
import CommunityPostDetailClient from './CommunityPostDetailClient'
import type { CommunityPost } from './CommunityPostDetailClient'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: post } = await supabase
    .from('community_posts')
    .select('title, content')
    .eq('id', id)
    .single()

  return {
    title: post ? `${post.title} | 동네생활 - Picnic` : '동네생활 | Picnic',
    description: post?.content?.substring(0, 100) || '러시아 한인 동네생활 커뮤니티',
  }
}

export default async function CommunityPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params
  const supabase = await createServerClient()

  // 서버에서 인증된 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || null

  let initialPost: CommunityPost | null = null
  let userRole: string | null = null

  if (userId) {
    // 프로필, 게시글, 좋아요/댓글 수를 병렬로 가져오기
    const [profileResult, postResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_role')
        .eq('id', userId)
        .single(),
      supabase
        .from('community_posts')
        .select(`
          id,
          title,
          content,
          images,
          category,
          created_at,
          user_id,
          is_hidden,
          hidden_at,
          hidden_by,
          view_count,
          profiles!community_posts_user_id_fkey (
            full_name,
            avatar_url,
            bread_level,
            user_role
          )
        `)
        .eq('id', postId)
        .single()
    ])

    userRole = profileResult.data?.user_role || null

    if (postResult.data) {
      const postData = postResult.data

      // 좋아요/댓글 수를 병렬로 가져오기
      const [likesResult, userLikeResult, commentsResult] = await Promise.all([
        supabase
          .from('community_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId),
        supabase
          .from('community_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('community_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
      ])

      const author = Array.isArray(postData.profiles)
        ? postData.profiles[0]
        : postData.profiles

      initialPost = {
        ...postData,
        profiles: author,
        likes_count: likesResult.count || 0,
        comments_count: commentsResult.count || 0,
        is_liked: !!userLikeResult.data,
      } as CommunityPost
    }
  }

  return (
    <CommunityPostDetailClient
      postId={postId}
      initialPost={initialPost}
      initialUserId={userId}
      initialUserRole={userRole}
    />
  )
}
