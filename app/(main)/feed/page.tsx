'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// 임시 데이터
const mockPosts = [
  {
    id: 1,
    title: '테슬라 모델 Y 주니퍼',
    price: 5500,
    location: '동탄6동',
    timeAgo: '2분 전',
    image: null,
    chatCount: 9,
    likeCount: 96,
  },
  {
    id: 2,
    title: '오피스텔 35.38㎡ 중층',
    price: 200,
    priceUnit: '월세 2,000/20만원',
    location: '반송동',
    timeAgo: '3일 전',
    image: null,
    chatCount: 1,
    likeCount: 33,
  },
  {
    id: 3,
    title: '아이폰 14 플러스 128GB 미드나이트',
    price: 150000,
    location: '능동',
    timeAgo: '1일 전',
    image: null,
    chatCount: 3,
    likeCount: 9,
  },
  {
    id: 4,
    title: '(급처!!!) 아이패드 에어4 스페이스 그레이',
    price: 343000,
    location: '신석동',
    timeAgo: '1일 전',
    image: null,
    chatCount: 5,
    likeCount: 19,
  },
]

const categories = [
  { id: 'all', label: '전체' },
  { id: 'nearby', label: '가까운 동네' },
  { id: 'recent', label: '방금 전' },
  { id: 'fashion', label: '정장' },
  { id: 'used', label: '중고거래' },
]

export default function FeedPage() {
  return (
    <div className="min-h-screen">
      {/* 카테고리 필터 */}
      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`
                px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${
                  category.id === 'all'
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }
              `}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* 게시물 목록 */}
      <div className="divide-y divide-border">
        {mockPosts.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className="flex gap-4 p-4 hover:bg-muted/30 transition-colors"
          >
            {/* 이미지 (임시 회색 박스) */}
            <div className="flex-shrink-0 w-28 h-28 bg-muted rounded-xl overflow-hidden">
              {post.image ? (
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  이미지
                </div>
              )}
            </div>

            {/* 내용 */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <h3 className="text-base font-normal line-clamp-2 mb-1">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                  {post.location} · {post.timeAgo}
                </p>
                <p className="text-lg font-bold">
                  {post.priceUnit
                    ? post.priceUnit
                    : post.price === 0
                    ? '무료나눔'
                    : `${post.price.toLocaleString()}만원`}
                </p>
              </div>

              {/* 채팅/좋아요 카운트 */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span>{post.chatCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <span>{post.likeCount}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* FAB 버튼 */}
      <Button
        asChild
        className="fab flex items-center justify-center"
      >
        <Link href="/post/new">
          <Plus className="w-6 h-6" />
          <span className="sr-only">글쓰기</span>
        </Link>
      </Button>
    </div>
  )
}
