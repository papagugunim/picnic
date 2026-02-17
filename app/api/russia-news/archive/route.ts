import { NextRequest, NextResponse } from 'next/server'

import { readCachedRussiaNews, writeCachedRussiaNews } from '@/lib/russia-news-cache'
import { fetchRussiaNewsFromUpstream } from '@/lib/russia-news-proxy'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cursor = searchParams.get('cursor')
  const topic = searchParams.get('topic')
  const limit = Number(searchParams.get('limit') || '20')

  const fallbackFromCache = () => {
    const cachedArchive = readCachedRussiaNews('archive', topic, limit)
    if (cachedArchive.length > 0) return cachedArchive
    return readCachedRussiaNews('today', topic, limit)
  }

  const fallbackFromAnyCache = () => {
    const cachedArchive = readCachedRussiaNews('archive', '', limit)
    if (cachedArchive.length > 0) return cachedArchive
    return readCachedRussiaNews('today', '', limit)
  }

  try {
    const payload = await fetchRussiaNewsFromUpstream({
      endpoint: '/api/archive',
      cursor,
      topic,
      limit,
    })

    // 특정 카테고리에 데이터가 없으면 전체 아카이브 뉴스로 fallback
    if (payload.items.length === 0 && topic) {
      const broadPayload = await fetchRussiaNewsFromUpstream({
        endpoint: '/api/archive',
        cursor,
        topic: null,
        limit,
      })
      if (broadPayload.items.length > 0) {
        writeCachedRussiaNews('archive', '', broadPayload.items)
        return NextResponse.json(broadPayload, {
          headers: {
            'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=120',
          },
        })
      }
    }

    if (payload.items.length > 0) {
      writeCachedRussiaNews('archive', topic, payload.items)
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
      { items: [], error: '지난 뉴스를 불러오지 못했습니다.' },
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
