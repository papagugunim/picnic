import { NextRequest, NextResponse } from 'next/server'

import { fetchRussiaNewsFromUpstream } from '@/lib/russia-news-proxy'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const topic = searchParams.get('topic')
    const limit = Number(searchParams.get('limit') || '20')

    const payload = await fetchRussiaNewsFromUpstream({
      endpoint: '/api/archive',
      cursor,
      topic,
      limit,
    })

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        items: [],
        error: error instanceof Error ? error.message : 'unknown_error',
      },
      { status: 200 }
    )
  }
}
