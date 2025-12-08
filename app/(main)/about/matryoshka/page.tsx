'use client'

import { ChevronLeft, Star, TrendingUp, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { MATRYOSHKA_LEVELS } from '@/lib/matryoshka'

export default function MatryoshkaInfoPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">마트료시카 등급 시스템</h1>
        </div>

        {/* Introduction */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 mb-6 shadow-lg">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🪆</div>
            <h2 className="text-2xl font-bold mb-3">피크닉 신뢰 등급</h2>
            <p className="text-muted-foreground">
              러시아 전통 인형 마트료시카처럼, 거래를 거듭할수록 더 큰 신뢰를 쌓아가세요!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">거래 평가</h3>
              <p className="text-sm text-muted-foreground">
                거래 후 상대방이 1-5개의 마트료시카로 평가
              </p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">활동 점수</h3>
              <p className="text-sm text-muted-foreground">
                게시물 작성, 채팅 응답 등 활동으로 점수 획득
              </p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">등급 상승</h3>
              <p className="text-sm text-muted-foreground">
                점수가 쌓이면 자동으로 다음 단계로 승급
              </p>
            </div>
          </div>
        </div>

        {/* Rating System */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 mb-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-6">거래 평가 방법</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl">
              <div className="text-4xl">🪆</div>
              <div className="flex-1">
                <div className="font-semibold">1개 - 별로예요</div>
                <div className="text-sm text-muted-foreground">약속을 지키지 않았거나 불친절했어요</div>
              </div>
              <div className="text-lg font-bold text-red-600">+10점</div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-xl">
              <div className="text-4xl">🪆🪆</div>
              <div className="flex-1">
                <div className="font-semibold">2개 - 그저 그래요</div>
                <div className="text-sm text-muted-foreground">거래는 했지만 아쉬운 점이 있었어요</div>
              </div>
              <div className="text-lg font-bold text-orange-600">+20점</div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-lime-50 dark:from-yellow-900/20 dark:to-lime-900/20 rounded-xl">
              <div className="text-4xl">🪆🪆🪆</div>
              <div className="flex-1">
                <div className="font-semibold">3개 - 괜찮아요</div>
                <div className="text-sm text-muted-foreground">평범한 거래였어요</div>
              </div>
              <div className="text-lg font-bold text-yellow-600">+30점</div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
              <div className="text-4xl">🪆🪆🪆🪆</div>
              <div className="flex-1">
                <div className="font-semibold">4개 - 좋아요</div>
                <div className="text-sm text-muted-foreground">친절하고 좋은 거래였어요</div>
              </div>
              <div className="text-lg font-bold text-green-600">+40점</div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
              <div className="text-4xl">🪆🪆🪆🪆🪆</div>
              <div className="flex-1">
                <div className="font-semibold">5개 - 최고예요!</div>
                <div className="text-sm text-muted-foreground">완벽한 거래! 다음에도 거래하고 싶어요</div>
              </div>
              <div className="text-lg font-bold text-purple-600">+50점</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <p className="text-sm text-center text-muted-foreground">
              💡 <strong>팁:</strong> 좋은 평가를 받으면 더 빨리 등급이 올라갑니다!
            </p>
          </div>
        </div>

        {/* Community Activity Score */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 mb-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-6">동네 생활 활동 점수</h2>
          <p className="text-muted-foreground mb-6">
            동네 생활에서 유용한 정보를 공유하고, 이웃들과 소통하면 좋아요를 받아 점수를 얻을 수 있어요!
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl border-2 border-pink-200 dark:border-pink-800">
              <div className="text-5xl">💬</div>
              <div className="flex-1">
                <div className="font-semibold text-lg mb-2">게시글 좋아요</div>
                <p className="text-sm text-muted-foreground mb-2">
                  동네 생활에 올린 게시글이 좋아요를 받으면 점수를 얻어요
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 rounded text-pink-700 dark:text-pink-300 font-medium">
                    좋아요 1개 = 1점
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
              <div className="text-5xl">💭</div>
              <div className="flex-1">
                <div className="font-semibold text-lg mb-2">댓글 좋아요</div>
                <p className="text-sm text-muted-foreground mb-2">
                  다른 사람의 게시글에 단 댓글이 좋아요를 받으면 점수를 얻어요
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300 font-medium">
                    좋아요 1개 = 1점
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              예시로 이해하기
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-lg">📝</span>
                <div>
                  <p className="font-medium mb-1">유용한 정보 글 작성 → 좋아요 10개 받음</p>
                  <p className="text-muted-foreground">
                    "모스크바 저렴한 한인마트 추천" 글을 써서 좋아요 10개를 받으면 <strong className="text-orange-600">+10점</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">💬</span>
                <div>
                  <p className="font-medium mb-1">도움되는 댓글 작성 → 좋아요 5개 받음</p>
                  <p className="text-muted-foreground">
                    "지하철 환승 방법 질문"에 친절한 답변을 달아서 좋아요 5개를 받으면 <strong className="text-orange-600">+5점</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">🎉</span>
                <div>
                  <p className="font-medium mb-1">합산 점수</p>
                  <p className="text-muted-foreground">
                    게시글 좋아요 10점 + 댓글 좋아요 5점 = <strong className="text-orange-600">총 15점 획득!</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <p className="text-sm text-center text-muted-foreground">
              💡 <strong>팁:</strong> 이웃들에게 도움이 되는 정보를 공유하면 자연스럽게 좋아요를 받고 등급이 올라가요!
            </p>
          </div>

          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800">
            <p className="text-sm text-center">
              ⚠️ <strong>일일 점수 제한:</strong> 동네 생활 활동으로 하루에 획득할 수 있는 점수는 <strong className="text-orange-600">최대 20점</strong>으로 제한됩니다. 도배성 게시물을 방지하고 공정한 등급 시스템을 유지하기 위함입니다.
            </p>
          </div>
        </div>

        {/* Level System */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 mb-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-6">등급 안내</h2>

          {/* Regular Levels */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">👥</span>
              일반 회원 등급
            </h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((level) => {
                const info = MATRYOSHKA_LEVELS[level as keyof typeof MATRYOSHKA_LEVELS]
                const scores = ['0-100점', '101-300점', '301-600점', '601-1000점', '1001점 이상']
                const descriptions = [
                  '피크닉을 시작한 새내기! 첫 거래로 신뢰를 쌓아보세요.',
                  '거래 경험이 생긴 활동 회원! 커뮤니티에 익숙해지고 있어요.',
                  '여러 거래로 신뢰를 쌓은 회원! 많은 분들이 안심하고 거래해요.',
                  '우수한 거래 매너를 인정받은 회원! 신뢰도가 높아요.',
                  '전문가 수준의 거래 실력! 피크닉의 자랑스러운 회원이에요.',
                ]
                return (
                  <div
                    key={level}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-105"
                    style={{
                      backgroundColor: info.color + '15',
                      border: '2px solid ' + info.color + '40',
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                      style={{
                        backgroundColor: info.color,
                        color: 'white',
                      }}
                    >
                      {info.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold" style={{ color: info.color }}>
                          {info.name}
                        </span>
                        <span className="text-xs px-2 py-1 bg-white/50 dark:bg-gray-700/50 rounded-full">
                          {scores[level - 1]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {descriptions[level - 1]}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Special Levels */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              특수 등급
            </h3>
            <div className="space-y-3">
              {[6, 7].map((level) => {
                const info = MATRYOSHKA_LEVELS[level as keyof typeof MATRYOSHKA_LEVELS]
                const descriptions = [
                  '피크닉 커뮤니티를 관리하는 관리자입니다.',
                  '피크닉 서비스를 개발하고 운영하는 개발자입니다.',
                ]
                return (
                  <div
                    key={level}
                    className="flex items-center gap-4 p-4 rounded-xl"
                    style={{
                      backgroundColor: info.color + '15',
                      border: '2px solid ' + info.color + '40',
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                      style={{
                        backgroundColor: info.color,
                        color: level === 6 ? '#1F2937' : 'white',
                      }}
                    >
                      {info.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold" style={{ color: info.color }}>
                          {info.name}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full">
                          특별 등급
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {descriptions[level - 6]}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">💡 등급을 올리는 팁</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <strong>약속 시간을 지키세요</strong>
                <p className="text-sm text-muted-foreground">정확한 시간에 나타나면 좋은 평가를 받을 확률이 높아요</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <strong>친절하게 대화하세요</strong>
                <p className="text-sm text-muted-foreground">예의 바른 대화는 신뢰의 시작입니다</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <strong>정확한 상품 정보를 올리세요</strong>
                <p className="text-sm text-muted-foreground">실물과 같은 사진과 설명으로 신뢰를 쌓아요</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <strong>빠르게 응답하세요</strong>
                <p className="text-sm text-muted-foreground">채팅에 빨리 답하면 활동 점수가 올라가요</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <strong>거래 후 평가를 남기세요</strong>
                <p className="text-sm text-muted-foreground">상대방에게도 평가를 남기면 활동 점수를 받을 수 있어요</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <strong>유용한 동네 정보를 공유하세요</strong>
                <p className="text-sm text-muted-foreground">맛집, 생활 팁, 문화 정보 등 이웃에게 도움되는 글은 많은 좋아요를 받아요</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <strong>다른 사람의 질문에 답변해주세요</strong>
                <p className="text-sm text-muted-foreground">친절하고 자세한 댓글은 좋아요를 받기 쉬워요</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
