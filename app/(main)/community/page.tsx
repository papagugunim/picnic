'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { getRandomLoadingMessage } from '@/lib/loading-messages'

interface CommunityPost {
  id: string
  title: string
  content: string
  images: string[] | null
  category: string
  created_at: string
  user_id: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
    matryoshka_level: number
    city: string | null
  }
  likes_count: number
  comments_count: number
  is_liked: boolean
}

const categories = [
  { id: 'all', name: '전체', emoji: '🏘️' },
  { id: 'question', name: '질문', emoji: '❓' },
  { id: 'info', name: '정보', emoji: '💡' },
  { id: 'event', name: '이벤트', emoji: '🎉' },
  { id: 'chat', name: '잡담', emoji: '💬' },
  { id: 'lost_found', name: '분실물', emoji: '🔍' },
]

export default function CommunityPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [selectedCategory])

  async function fetchPosts() {
    try {
      setIsLoading(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // Get current user's city
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single()

      const userCity = currentUserProfile?.city

      // Build query
      let query = supabase
        .from('community_posts')
        .select(`
          id,
          title,
          content,
          images,
          category,
          created_at,
          user_id,
          profiles!community_posts_user_id_fkey (
            full_name,
            avatar_url,
            matryoshka_level,
            city
          )
        `)
        .order('created_at', { ascending: false })

      // Filter by category if not 'all'
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data: postsData, error: postsError } = await query

      if (postsError) {
        console.error('Posts fetch error:', postsError)
        return
      }

      // Filter posts by city (작성자의 도시가 현재 사용자의 도시와 일치하는 게시글만)
      const filteredByCity = userCity
        ? (postsData || []).filter((post) => {
            const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
            return author?.city === userCity
          })
        : postsData

      // For each post, get likes count, comments count, and check if user liked
      const postsWithCounts = await Promise.all(
        (filteredByCity || []).map(async (post) => {
          // Get likes count
          const { count: likesCount } = await supabase
            .from('community_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)

          // Get comments count
          const { count: commentsCount } = await supabase
            .from('community_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)

          // Check if current user liked this post
          const { data: userLike } = await supabase
            .from('community_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single()

          // Extract author profile (Supabase returns it as array)
          const postAuthor = Array.isArray(post.profiles)
            ? post.profiles[0]
            : post.profiles

          return {
            ...post,
            profiles: postAuthor,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            is_liked: !!userLike,
          }
        })
      )

      setPosts(postsWithCounts as CommunityPost[])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleLike(postId: string, currentlyLiked: boolean) {
    if (!currentUserId) return

    const supabase = createClient()

    if (currentlyLiked) {
      // Unlike
      await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
    } else {
      // Like
      await supabase
        .from('community_likes')
        .insert({
          post_id: postId,
          user_id: currentUserId,
        })
    }

    // Refresh posts
    fetchPosts()
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return '방금 전'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  const getCategoryEmoji = (category: string) => {
    const cat = categories.find((c) => c.id === category)
    return cat?.emoji || '📌'
  }

  const getCategoryName = (category: string) => {
    const cat = categories.find((c) => c.id === category)
    return cat?.name || category
  }

  const filteredPosts = posts.filter((post) =>
    searchQuery
      ? post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold mb-4">동네생활</h1>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="게시글 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-muted'
                  }`}
                >
                  <span className="mr-1">{category.emoji}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">
              {getRandomLoadingMessage()}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? '검색 결과가 없습니다'
                  : '아직 게시글이 없습니다'}
              </p>
              <Button onClick={() => router.push('/community/new')}>
                <Plus className="w-4 h-4 mr-2" />
                첫 게시글 작성하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Post Header */}
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Avatar */}
                      <Link href={`/profile/${post.user_id}`}>
                        {post.profiles.avatar_url ? (
                          <img
                            src={post.profiles.avatar_url}
                            alt={post.profiles.full_name || '사용자'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                            {post.profiles.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/profile/${post.user_id}`}
                            className="font-medium hover:underline"
                          >
                            {post.profiles.full_name || '익명'}
                          </Link>
                          <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                            {getCategoryEmoji(post.category)} {getCategoryName(post.category)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimeAgo(post.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <Link href={`/community/${post.id}`}>
                      <h3 className="font-semibold text-lg mb-2 hover:underline">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground line-clamp-3 mb-3">
                        {post.content}
                      </p>

                      {/* Images */}
                      {post.images && post.images.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-x-auto">
                          {post.images.slice(0, 3).map((image, idx) => (
                            <img
                              key={idx}
                              src={image}
                              alt={`이미지 ${idx + 1}`}
                              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                            />
                          ))}
                          {post.images.length > 3 && (
                            <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-medium">
                              +{post.images.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </Link>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-3 border-t border-border">
                      <button
                        onClick={() => toggleLike(post.id, post.is_liked)}
                        className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            post.is_liked
                              ? 'fill-red-500 text-red-500'
                              : 'text-muted-foreground'
                          }`}
                        />
                        <span className={post.is_liked ? 'text-red-500' : 'text-muted-foreground'}>
                          {post.likes_count}
                        </span>
                      </button>

                      <Link
                        href={`/community/${post.id}`}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>{post.comments_count}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => router.push('/community/new')}
          className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-30"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
