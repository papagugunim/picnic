import { NextRequest, NextResponse } from 'next/server'

import { readCachedRussiaNews, writeCachedRussiaNews } from '@/lib/russia-news-cache'
import { getEmergencyFallbackNews } from '@/lib/russia-news-fallback'
import { fetchRussiaNewsFromUpstream } from '@/lib/russia-news-proxy'
import type { RussiaNewsApiPayload, RussiaNewsTopic } from '@/lib/russia-news'

const TOPIC_BUCKETS: RussiaNewsTopic[] = ['사회', '경제', '문화', '날씨']

function mergeUniqueItems(payloads: RussiaNewsApiPayload[], limit: number): RussiaNewsApiPayload {
  const map = new Map<string, RussiaNewsApiPayload['items'][number]>()
  for (const payload of payloads) {
    for (const item of payload.items) {
      if (!map.has(item.id)) {
        map.set(item.id, item)
      }
    }
  }
  return {
    items: Array.from(map.values()).slice(0, Math.max(1, Math.min(limit, 20))),
  }
}

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

    // 전체 토픽에서 빈 응답이 나오는 업스트림을 대비해 카테고리별 결과를 병합한다.
    if (payload.items.length === 0 && !topic && !cursor) {
      const bucketResults = await Promise.allSettled(
        TOPIC_BUCKETS.map((bucket) =>
          fetchRussiaNewsFromUpstream({
            endpoint: '/api/today-news',
            topic: bucket,
            limit: Math.max(limit, 4),
          })
        )
      )

      const merged = mergeUniqueItems(
        bucketResults
          .filter((result): result is PromiseFulfilledResult<RussiaNewsApiPayload> => result.status === 'fulfilled')
          .map((result) => result.value),
        limit
      )

      if (merged.items.length > 0) {
        payload = merged
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

    const emergencyItems = getEmergencyFallbackNews(topic, limit)
    return NextResponse.json(
      { items: emergencyItems, stale: true, fallback: 'emergency-static' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
          'X-Russia-News-Fallback': 'emergency-static',
        },
      }
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

    const emergencyItems = getEmergencyFallbackNews(topic, limit)
    return NextResponse.json(
      {
        items: emergencyItems,
        stale: true,
        fallback: 'emergency-static',
        error: error instanceof Error ? error.message : 'unknown_error',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
          'X-Russia-News-Fallback': 'emergency-static-on-error',
        },
      }
    )
  }
}
