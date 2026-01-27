'use client'

import { createNamespacedLogger } from '@/lib/logger'

const logger = createNamespacedLogger('Page')
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, Heart, MessageCircle, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { UserAvatar } from '@/components/ui/user-avatar'
import { getBreadEmoji } from '@/lib/bread'

interface PostSearchResult {
  type: 'post'
  id: string
  title: string
  description: string
  price: number | null
  city: string
  created_at: string
  images: string[]
  profiles: {
    full_name: string | null
    avatar_url: string | null
    matryoshka_level: number
  }
}

interface CommunitySearchResult {
  type: 'community'
  id: string
  title: string
  content: string
  category: string
  created_at: string
  images: string[] | null
  user_id: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
    matryoshka_level: number
    user_role: string | null
  }
  likes_count: number
  comments_count: number
}

type SearchResult = PostSearchResult | CommunitySearchResult

const categories = [
  { id: 'all', name: '전체', emoji: '🔍' },
  { id: 'posts', name: '중고거래', emoji: '🛒' },
  { id: 'community', name: '동네생활', emoji: '🏘️' },
]

const communityCategories: { [key: string]: { name: string; emoji: string } } = {
  question: { name: '질문', emoji: '❓' },
  info: { name: '정보', emoji: '💡' },
  event: { name: '이벤트', emoji: '🎉' },
  chat: { name: '잡담', emoji: '💬' },
  lost_found: { name: '분실물', emoji: '🔍' },
}

export default function SearchPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [hasSearched, setHasSearched] = useState(false)

  async function handleSearch() {
    if (!searchQuery.trim()) return

    try {
      setIsLoading(true)
      setHasSearched(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user's city for filtering
      const { data: profile } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single()

      const userCity = profile?.city

      let allResults: SearchResult[] = []

      // Search in posts (판매글) if category is 'all' or 'posts'
      if (selectedCategory === 'all' || selectedCategory === 'posts') {
        let postsQuery = supabase
          .from('posts')
          .select(`
            id,
            title,
            description,
            price,
            city,
            created_at,
            images,
            profiles:author_id (
              full_name,
              avatar_url,
              matryoshka_level
            )
          `)
          .eq('status', 'active')
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .order('created_at', { ascending: false })
          .limit(20)

        if (userCity) {
          postsQuery = postsQuery.eq('city', userCity)
        }

        const { data: postsData, error: postsError } = await postsQuery

        if (postsError) {
          logger.error('Posts search error:', postsError)
        } else if (postsData) {
          const postsResults: PostSearchResult[] = postsData.map((post: any) => {
            const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
            return {
              type: 'post',
              id: post.id,
              title: post.title,
              description: post.description,
              price: post.price,
              city: post.city,
              created_at: post.created_at,
              images: post.images,
              profiles: author,
            }
          })
          allResults = [...allResults, ...postsResults]
        }
      }

      // Search in community_posts (동네생활) if category is 'all' or 'community'
      if (selectedCategory === 'all' || selectedCategory === 'community') {
        const { data: communityData, error: communityError } = await supabase
          .from('community_posts')
          .select(`
            id,
            title,
            content,
            category,
            created_at,
            images,
            user_id,
            profiles!community_posts_user_id_fkey (
              full_name,
              avatar_url,
              matryoshka_level,
              city,
              user_role
            )
          `)
          .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
          .order('created_at', { ascending: false })
          .limit(20)

        if (communityError) {
          logger.error('Community search error:', communityError)
        } else if (communityData) {
          // Filter by city
          const filteredCommunityData = userCity
            ? communityData.filter((post: any) => {
                const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
                return author?.city === userCity
              })
            : communityData

          // Get likes and comments count
          const postIds = filteredCommunityData.map((p: any) => p.id)

          const [likesResult, commentsResult] = await Promise.all([
            supabase
              .from('community_likes')
              .select('post_id')
              .in('post_id', postIds),
            supabase
              .from('community_comments')
              .select('post_id')
              .in('post_id', postIds)
          ])

          const likesCountMap = new Map<string, number>()
          const commentsCountMap = new Map<string, number>()

          ;(likesResult.data || []).forEach((like: any) => {
            likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1)
          })

          ;(commentsResult.data || []).forEach((comment: any) => {
            commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1)
          })

          const communityResults: CommunitySearchResult[] = filteredCommunityData.map((post: any) => {
            const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
            return {
              type: 'community',
              id: post.id,
              title: post.title,
              content: post.content,
              category: post.category,
              created_at: post.created_at,
              images: post.images,
              user_id: post.user_id,
              profiles: author,
              likes_count: likesCountMap.get(post.id) || 0,
              comments_count: commentsCountMap.get(post.id) || 0,
            }
          })
          allResults = [...allResults, ...communityResults]
        }
      }

      // Sort all results by created_at (최신순)
      allResults.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setResults(allResults)
    } catch (err) {
      logger.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
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

  const getCityNameInKorean = (city: string) => {
    const cityMap: { [key: string]: string } = {
      'moscow': '모스크바',
      'saint_petersburg': '상트페테르부르크',
      'vladivostok': '블라디보스토크',
      'khabarovsk': '하바롭스크',
      'irkutsk': '이르쿠츠크',
    }
    return cityMap[city.toLowerCase()] || city
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="검색어를 입력하세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 pr-4"
                autoFocus
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading || !searchQuery.trim()}
              className="flex-shrink-0"
            >
              {isLoading ? '검색 중...' : '검색'}
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
              >
                <span className="mr-1">{category.emoji}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-4">
        {!hasSearched ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              검색어를 입력하고 검색 버튼을 눌러주세요
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">검색 중...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-2">검색 결과가 없습니다</p>
            <p className="text-sm text-muted-foreground">
              다른 검색어로 시도해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              총 {results.length}개의 검색 결과
            </p>

            {results.map((result) => {
              if (result.type === 'post') {
                return (
                  <Link
                    key={`post-${result.id}`}
                    href={`/post/${result.id}`}
                    className="block bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4 p-4">
                      {/* 이미지 */}
                      <div className="flex-shrink-0 w-28 h-28 bg-muted rounded-xl overflow-hidden relative">
                        {result.images && result.images.length > 0 ? (
                          <Image
                            src={result.images[0]}
                            alt={result.title}
                            fill
                            sizes="112px"
                            className="object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            이미지 없음
                          </div>
                        )}
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="text-xs text-primary font-medium mb-1">
                            🛒 중고거래
                          </div>
                          <h3 className="text-base font-normal line-clamp-2 mb-1">
                            {result.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                            {result.description}
                          </p>
                          <div className="text-sm text-muted-foreground mb-1">
                            <span>{getCityNameInKorean(result.city)}</span>
                            <span> · </span>
                            <span>{formatTimeAgo(result.created_at)}</span>
                          </div>
                          <p className="text-lg font-bold">
                            {result.price === 0 || result.price === null
                              ? '무료나눔'
                              : `${result.price.toLocaleString()}₽`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              } else {
                // Community post
                return (
                  <Link
                    key={`community-${result.id}`}
                    href={`/community/${result.id}`}
                    className="block bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <UserAvatar
                          src={result.profiles.avatar_url}
                          alt={result.profiles.full_name || '사용자'}
                          matryoshkaLevel={result.profiles.matryoshka_level}
                          size="sm"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {result.profiles.full_name || '익명'}
                            </span>
                            <span className="text-sm">
                              {getBreadEmoji(result.profiles.matryoshka_level, result.profiles.user_role || undefined)}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                              {communityCategories[result.category]?.emoji} {communityCategories[result.category]?.name || result.category}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimeAgo(result.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="text-xs text-primary font-medium mb-1">
                          🏘️ 동네생활
                        </div>
                        <h3 className="font-semibold text-base mb-2 line-clamp-1">
                          {result.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.content}
                        </p>
                      </div>

                      {result.images && result.images.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-x-auto">
                          {result.images.slice(0, 3).map((image, idx) => (
                            <div
                              key={idx}
                              className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative"
                            >
                              <Image
                                src={image}
                                alt={`이미지 ${idx + 1}`}
                                fill
                                sizes="80px"
                                className="object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-border pt-3">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{result.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{result.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              }
            })}
          </div>
        )}
      </div>
    </div>
  )
}
