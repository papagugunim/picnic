import { NextRequest, NextResponse } from 'next/server'

import { fetchFromExternalArchive } from '@/lib/russia-news-external-archive'
import { normalizeTopic } from '@/lib/russia-news'
import { checkUpstashRateLimit, getRateLimitIdentifier } from '@/lib/upstash'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const topicInput = searchParams.get('topic')
  const topic = normalizeTopic(topicInput)
  const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || '10'), 30))

  const requester = getRateLimitIdentifier(request.headers, `russia-news-external:${topic || 'all'}`)
  const limitResult = await checkUpstashRateLimit('russia-news-external-api', requester, 60, 60)
  if (!limitResult.success) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': '30' } }
    )
  }

  const items = await fetchFromExternalArchive({ limit, topic: topic || null })

  return NextResponse.json(
    { items },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  )
}
