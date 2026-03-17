import { NextRequest, NextResponse } from 'next/server'

import { readCachedRussiaNews, writeCachedRussiaNews } from '@/lib/russia-news-cache'
import { getEmergencyFallbackNews } from '@/lib/russia-news-fallback'
import { fetchRussiaNewsFromUpstream } from '@/lib/russia-news-proxy'
import { normalizeTopic, type RussiaNewsApiPayload, type RussiaNewsTopic } from '@/lib/russia-news'
import { readUpstashRussiaNews, writeUpstashRussiaNews } from '@/lib/russia-news-upstash-cache'
import { isInArchiveWindow, readRussiaNewsFromArchiveStore, saveRussiaNewsArchiveItems } from '@/lib/russia-news-archive-store'
import { checkUpstashRateLimit, getRateLimitIdentifier } from '@/lib/upstash'
import { fetchFromExternalArchive } from '@/lib/russia-news-external-archive'

const TOPIC_BUCKETS: RussiaNewsTopic[] = ['정치', '사회', '경제', '문화', '날씨']

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

function filterPayloadByTopic(payload: RussiaNewsApiPayload, topicInput: string | null): RussiaNewsApiPayload {
  const requestedTopic = normalizeTopic(topicInput)
  if (!requestedTopic) return payload
  return {
    items: payload.items.filter((item) => normalizeTopic(item.topic || null) === requestedTopic),
  }
}

function filterPayloadToArchiveWindow(payload: RussiaNewsApiPayload): RussiaNewsApiPayload {
  return {
    items: payload.items.filter((item) => isInArchiveWindow(item.published_at)),
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cursor = searchParams.get('cursor')
  const topic = searchParams.get('topic')
  const limit = Number(searchParams.get('limit') || '20')
  const requester = getRateLimitIdentifier(request.headers, `russia-news:${topic || 'all'}`)

  const limitResult = await checkUpstashRateLimit('russia-news-api', requester, 180, 60)
  if (!limitResult.success) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      {
        status: 429,
        headers: {
          'Retry-After': '30',
        },
      }
    )
  }

  const fallbackFromStore = async () => {
    return readRussiaNewsFromArchiveStore({
      topic,
      limit,
      cursor,
    })
  }

  const fallbackFromCache = async () => {
    const cachedToday = readCachedRussiaNews('today', topic, limit, cursor)
    if (cachedToday.length > 0) {
      return cachedToday
    }

    const upstashToday = await readUpstashRussiaNews('today', topic, limit, cursor)
    if (upstashToday.length > 0) {
      return upstashToday
    }

    const cachedArchive = readCachedRussiaNews('archive', topic, limit, cursor)
    if (cachedArchive.length > 0) {
      return cachedArchive
    }

    return readUpstashRussiaNews('archive', topic, limit, cursor)
  }

  const fallbackFromAnyCache = async () => {
    const cachedToday = readCachedRussiaNews('today', '', limit, cursor)
    if (cachedToday.length > 0) {
      return cachedToday
    }

    const upstashToday = await readUpstashRussiaNews('today', '', limit, cursor)
    if (upstashToday.length > 0) {
      return upstashToday
    }

    const cachedArchive = readCachedRussiaNews('archive', '', limit, cursor)
    if (cachedArchive.length > 0) {
      return cachedArchive
    }

    return readUpstashRussiaNews('archive', '', limit, cursor)
  }

  try {
    let payload = filterPayloadToArchiveWindow(filterPayloadByTopic(
      await fetchRussiaNewsFromUpstream({
        endpoint: '/api/today-news',
        cursor,
        topic,
        limit,
      }),
      topic
    ))

    if (!cursor && payload.items.length === 0) {
      payload = filterPayloadToArchiveWindow(filterPayloadByTopic(
        await fetchRussiaNewsFromUpstream({
          endpoint: '/api/today-news',
          cursor,
          topic,
          limit: Math.max(limit, 12),
        }),
        topic
      ))
    }

    // today endpoint가 비어 있으면 archive를 즉시 fallback으로 사용
    if (payload.items.length === 0) {
      const archivePayload = filterPayloadToArchiveWindow(filterPayloadByTopic(
        await fetchRussiaNewsFromUpstream({
          endpoint: '/api/archive',
          cursor,
          topic,
          limit,
        }),
        topic
      ))
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

      const merged = filterPayloadToArchiveWindow(mergeUniqueItems(
        bucketResults
          .filter((result): result is PromiseFulfilledResult<RussiaNewsApiPayload> => result.status === 'fulfilled')
          .map((result) => result.value),
        limit
      ))

      if (merged.items.length > 0) {
        payload = merged
      }
    }

    // 특정 카테고리에 데이터가 없으면 전체 뉴스로 fallback
    if (payload.items.length === 0 && topic) {
      const broadPayload = filterPayloadToArchiveWindow(filterPayloadByTopic(
        await fetchRussiaNewsFromUpstream({
          endpoint: '/api/today-news',
          cursor,
          topic: null,
          limit,
        }),
        topic
      ))
      if (broadPayload.items.length > 0) {
        payload = broadPayload
      }
    }

    if (payload.items.length > 0) {
      await saveRussiaNewsArchiveItems(payload.items)
      writeCachedRussiaNews('today', topic, payload.items)
      await writeUpstashRussiaNews('today', topic, limit, cursor, payload.items)
      return NextResponse.json(payload, {
        headers: {
          'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=120',
        },
      })
    }

    const storedItems = await fallbackFromStore()
    if (storedItems.length > 0) {
      writeCachedRussiaNews('today', topic, storedItems)
      await writeUpstashRussiaNews('today', topic, limit, cursor, storedItems)
      return NextResponse.json(
        { items: storedItems, stale: true, fallback: 'archive-store' },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
            'X-Russia-News-Fallback': 'archive-store',
          },
        }
      )
    }

    // rnews-archive.vercel.app 외부 아카이브 폴백
    if (!cursor) {
      const externalItems = await fetchFromExternalArchive({ limit, topic })
      if (externalItems.length > 0) {
        await saveRussiaNewsArchiveItems(externalItems)
        writeCachedRussiaNews('today', topic, externalItems)
        await writeUpstashRussiaNews('today', topic, limit, cursor, externalItems)
        return NextResponse.json(
          { items: externalItems, stale: false, fallback: 'external-archive' },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
              'X-Russia-News-Fallback': 'external-archive',
            },
          }
        )
      }
    }

    const cachedItems = await fallbackFromCache()
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
      const anyCachedItems = await fallbackFromAnyCache()
      const broadCachedItems = filterPayloadByTopic(
        { items: anyCachedItems },
        topic
      ).items
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
    const storedItems = await fallbackFromStore()
    if (storedItems.length > 0) {
      writeCachedRussiaNews('today', topic, storedItems)
      await writeUpstashRussiaNews('today', topic, limit, cursor, storedItems)
      return NextResponse.json(
        { items: storedItems, stale: true, fallback: 'archive-store-on-error' },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
            'X-Russia-News-Fallback': 'archive-store-on-error',
          },
        }
      )
    }

    // rnews-archive.vercel.app 외부 아카이브 폴백 (에러 상황)
    if (!cursor) {
      try {
        const externalItems = await fetchFromExternalArchive({ limit, topic })
        if (externalItems.length > 0) {
          await saveRussiaNewsArchiveItems(externalItems)
          writeCachedRussiaNews('today', topic, externalItems)
          await writeUpstashRussiaNews('today', topic, limit, cursor, externalItems)
          return NextResponse.json(
            { items: externalItems, stale: false, fallback: 'external-archive-on-error' },
            {
              headers: {
                'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
                'X-Russia-News-Fallback': 'external-archive-on-error',
              },
            }
          )
        }
      } catch {
        // 외부 아카이브도 실패하면 다음 폴백으로 진행
      }
    }

    const cachedItems = await fallbackFromCache()
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
      const anyCachedItems = await fallbackFromAnyCache()
      const broadCachedItems = filterPayloadByTopic(
        { items: anyCachedItems },
        topic
      ).items
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
