'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { MapPin, Heart, MessageCircle } from 'lucide-react'
import { getRandomLoadingMessage } from '@/lib/loading-messages'

// 예시 데이터
const SAMPLE_ITEMS = [
  {
    id: 1,
    title: '아이폰 13 Pro 256GB',
    price: '50000₽',
    location: '소콜니키',
    timeAgo: '1시간 전',
    image: null,
    likes: 12,
    chats: 5,
  },
  {
    id: 2,
    title: 'IKEA 책상 (거의 새것)',
    price: '15000₽',
    location: '크라스니예 보로타',
    timeAgo: '3시간 전',
    image: null,
    likes: 8,
    chats: 3,
  },
  {
    id: 3,
    title: '겨울 코트 (여성용)',
    price: '8000₽',
    location: '루뱐카',
    timeAgo: '5시간 전',
    image: null,
    likes: 15,
    chats: 7,
  },
  {
    id: 4,
    title: '에어팟 프로 2세대',
    price: '18000₽',
    location: '파르크 쿨투리',
    timeAgo: '1일 전',
    image: null,
    likes: 20,
    chats: 12,
  },
  {
    id: 5,
    title: 'MacBook Air M1',
    price: '65000₽',
    location: '우니베르시테트',
    timeAgo: '2일 전',
    image: null,
    likes: 25,
    chats: 15,
  },
]

export default function WelcomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // 프로필 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setUser(profile)
      setLoading(false)
    }

    loadUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{getRandomLoadingMessage()}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 환영 헤더 */}
      <div className="bg-primary text-primary-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            환영합니다, {user?.full_name}님! 👋
          </h1>
          <p className="text-primary-foreground/90 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {user?.city === 'moscow' ? '모스크바' : '상트페테르부르크'}
          </p>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-card rounded-xl p-6 mb-6 border border-border">
          <h2 className="text-xl font-bold mb-2">피크닉에 오신 것을 환영합니다!</h2>
          <p className="text-muted-foreground mb-4">
            회원님이 선택하신 지역 근처에서 판매 중인 물품들을 확인해보세요.
          </p>
          <p className="text-sm text-muted-foreground">
            💡 아래는 예시 데이터입니다. 실제 서비스에서는 실시간 판매 물품이 표시됩니다.
          </p>
        </div>

        {/* 물품 목록 */}
        <div className="space-y-3 mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            내 근처 판매 물품
          </h3>
          
          {SAMPLE_ITEMS.map((item) => (
            <div key={item.id} className="bg-card rounded-xl border border-border hover:border-primary/50 transition-colors">
              <div className="flex gap-4 p-4">
                {/* 이미지 영역 */}
                <div className="flex-shrink-0 w-28 h-28 bg-muted rounded-xl flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>

                {/* 정보 영역 */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium mb-1 truncate">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.location} · {item.timeAgo}
                  </p>
                  <p className="text-lg font-bold text-primary mb-2">{item.price}</p>
                  
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {item.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {item.chats}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 시작하기 버튼 */}
        <Link href="/feed">
          <Button className="w-full h-12 text-base" size="lg">
            피크닉 시작하기 →
          </Button>
        </Link>
      </div>
    </div>
  )
}
