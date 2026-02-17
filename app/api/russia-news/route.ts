import { NextRequest, NextResponse } from 'next/server'

import { readCachedRussiaNews, writeCachedRussiaNews } from '@/lib/russia-news-cache'
import { fetchRussiaNewsFromUpstream } from '@/lib/russia-news-proxy'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cursor = searchParams.get('cursor')
  const topic = searchParams.get('topic')
  const limit = Number(searchParams.get('limit') || '20')

  const fallbackFromCache = () => {
    const cachedToday = readCachedRussiaNews('today', topic, limit)
    if (cachedToday.length > 0) {
      return cachedToday
    }

    const cachedArchive = readCachedRussiaNews('archive', topic, limit)
    return cachedArchive
  }

  const fallbackFromAnyCache = () => {
    const cachedToday = readCachedRussiaNews('today', '', limit)
    if (cachedToday.length > 0) {
      return cachedToday
    }
    return readCachedRussiaNews('archive', '', limit)
  }

  try {
    let payload = await fetchRussiaNewsFromUpstream({
      endpoint: '/api/today-news',
      cursor,
      topic,
      limit,
    })

    if (!cursor && payload.items.length === 0) {
      payload = await fetchRussiaNewsFromUpstream({
        endpoint: '/api/today-news',
        cursor,
        topic,
        limit: Math.max(limit, 12),
      })
    }

    // today endpoint가 비어 있으면 archive를 즉시 fallback으로 사용
    if (payload.items.length === 0) {
      const archivePayload = await fetchRussiaNewsFromUpstream({
        endpoint: '/api/archive',
        cursor,
        topic,
        limit,
      })
      if (archivePayload.items.length > 0) {
        payload = archivePayload
      }
    }

    // 특정 카테고리에 데이터가 없으면 전체 뉴스로 fallback
    if (payload.items.length === 0 && topic) {
      const broadPayload = await fetchRussiaNewsFromUpstream({
        endpoint: '/api/today-news',
        cursor,
        topic: null,
        limit,
      })
      if (broadPayload.items.length > 0) {
        payload = broadPayload
      }
    }

    if (payload.items.length > 0) {
      writeCachedRussiaNews('today', topic, payload.items)
      return NextResponse.json(payload, {
        headers: {
          'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=120',
        },
      })
    }

    const cachedItems = fallbackFromCache()
    if (cachedItems.length > 0) {
      return NextResponse.json(
        { items: cachedItems, stale: true },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            'X-Russia-News-Fallback': 'cache',
          },
        }
      )
    }

    if (topic) {
      const broadCachedItems = fallbackFromAnyCache()
      if (broadCachedItems.length > 0) {
        return NextResponse.json(
          { items: broadCachedItems, stale: true, fallback: 'all-topic-cache' },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
              'X-Russia-News-Fallback': 'all-topic-cache',
            },
          }
        )
      }
    }

    return NextResponse.json(
      { items: [], error: '뉴스를 불러오지 못했습니다.' },
      { status: 503 }
    )
  } catch (error) {
    const cachedItems = fallbackFromCache()
    if (cachedItems.length > 0) {
      return NextResponse.json(
        { items: cachedItems, stale: true },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            'X-Russia-News-Fallback': 'cache-on-error',
          },
        }
      )
    }

    if (topic) {
      const broadCachedItems = fallbackFromAnyCache()
      if (broadCachedItems.length > 0) {
        return NextResponse.json(
          { items: broadCachedItems, stale: true, fallback: 'all-topic-cache' },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
              'X-Russia-News-Fallback': 'all-topic-cache-on-error',
            },
          }
        )
      }
    }

    return NextResponse.json(
      {
        items: [],
        error: error instanceof Error ? error.message : 'unknown_error',
      },
      { status: 503 }
    )
  }
}
