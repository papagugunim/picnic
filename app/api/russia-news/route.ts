import { NextRequest, NextResponse } from 'next/server'

import { fetchRussiaNewsFromUpstream } from '@/lib/russia-news-proxy'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const topic = searchParams.get('topic')
    const limit = Number(searchParams.get('limit') || '20')

    let payload = await fetchRussiaNewsFromUpstream({
      endpoint: '/api/today-news',
      cursor,
      topic,
      limit,
    })

    // Upstream occasionally returns an empty list for non-empty datasets.
    // Retry once with a slightly larger limit for the first page.
    if (!cursor && payload.items.length === 0) {
      payload = await fetchRussiaNewsFromUpstream({
        endpoint: '/api/today-news',
        cursor,
        topic,
        limit: Math.max(limit, 12),
      })
    }

    const shouldCache = payload.items.length > 0
    const cacheControl = shouldCache
      ? 'public, s-maxage=180, stale-while-revalidate=120'
      : 'no-store, max-age=0'

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': cacheControl,
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
