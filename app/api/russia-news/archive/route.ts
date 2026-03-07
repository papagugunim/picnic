import { NextRequest, NextResponse } from 'next/server'

import { readCachedRussiaNews, writeCachedRussiaNews } from '@/lib/russia-news-cache'
import { getEmergencyFallbackNews } from '@/lib/russia-news-fallback'
import { fetchRussiaNewsFromUpstream } from '@/lib/russia-news-proxy'
import { normalizeTopic, type RussiaNewsApiPayload, type RussiaNewsTopic } from '@/lib/russia-news'
import { readUpstashRussiaNews, writeUpstashRussiaNews } from '@/lib/russia-news-upstash-cache'
import { isInArchiveWindow, readRussiaNewsFromArchiveStore, saveRussiaNewsArchiveItems } from '@/lib/russia-news-archive-store'
import { checkUpstashRateLimit, getRateLimitIdentifier } from '@/lib/upstash'

const TOPIC_BUCKETS: RussiaNewsTopic[] = ['정치', '사회', '경제', '문화', '날씨']

function parsePublishedAtMs(value: string): number {
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

function toSafeLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 20
  return Math.max(1, Math.min(Math.floor(limit), 50))
}

function mergeArchiveItems(items: RussiaNewsApiPayload['items'], limit: number): RussiaNewsApiPayload['items'] {
  const map = new Map<string, RussiaNewsApiPayload['items'][number]>()
  for (const item of items) {
    if (!isInArchiveWindow(item.published_at)) continue
    const key = `${item.id}|${item.published_at}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  }

  return Array.from(map.values())
    .sort((a, b) => parsePublishedAtMs(b.published_at) - parsePublishedAtMs(a.published_at))
    .slice(0, toSafeLimit(limit))
}

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
    items: mergeArchiveItems(Array.from(map.values()), limit),
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
  const requester = getRateLimitIdentifier(request.headers, `russia-news-archive:${topic || 'all'}`)

  const limitResult = await checkUpstashRateLimit('russia-news-archive-api', requester, 180, 60)
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

  const fallbackFromCache = async () => {
    const cachedArchive = readCachedRussiaNews('archive', topic, limit, cursor)
    if (cachedArchive.length > 0) return cachedArchive

    const upstashArchive = await readUpstashRussiaNews('archive', topic, limit, cursor)
    if (upstashArchive.length > 0) return upstashArchive

    const cachedToday = readCachedRussiaNews('today', topic, limit, cursor)
    if (cachedToday.length > 0) return cachedToday

    return readUpstashRussiaNews('today', topic, limit, cursor)
  }

  const fallbackFromStore = async () => {
    const storedArchive = await readRussiaNewsFromArchiveStore({
      topic,
      limit,
      cursor,
    })
    return storedArchive
  }

  const fallbackFromAnyCache = async () => {
    const cachedArchive = readCachedRussiaNews('archive', '', limit, cursor)
    if (cachedArchive.length > 0) return cachedArchive

    const upstashArchive = await readUpstashRussiaNews('archive', '', limit, cursor)
    if (upstashArchive.length > 0) return upstashArchive

    const cachedToday = readCachedRussiaNews('today', '', limit, cursor)
    if (cachedToday.length > 0) return cachedToday

    return readUpstashRussiaNews('today', '', limit, cursor)
  }

  try {
    // cursor 기반 요청은 저장소/캐시 우선으로 처리해 무한 스크롤이 안정적으로 이어지도록 한다.
    if (cursor) {
      const storedItems = await fallbackFromStore()
      if (storedItems.length > 0) {
        writeCachedRussiaNews('archive', topic, storedItems)
        await writeUpstashRussiaNews('archive', topic, limit, cursor, storedItems)
        return NextResponse.json(
          { items: mergeArchiveItems(storedItems, limit), stale: true, fallback: 'archive-store-cursor' },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
              'X-Russia-News-Fallback': 'archive-store-cursor',
            },
          }
        )
      }

      const cachedItems = await fallbackFromCache()
      if (cachedItems.length > 0) {
        return NextResponse.json(
          { items: mergeArchiveItems(cachedItems, limit), stale: true, fallback: 'cache-cursor' },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
              'X-Russia-News-Fallback': 'cache-cursor',
            },
          }
        )
      }

      return NextResponse.json(
        { items: [], stale: true, fallback: 'empty-after-cursor' },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            'X-Russia-News-Fallback': 'empty-after-cursor',
          },
        }
      )
    }

    const [archiveUpstream, todayUpstream] = await Promise.all([
      fetchRussiaNewsFromUpstream({
        endpoint: '/api/archive',
        cursor,
        topic,
        limit,
      }),
      fetchRussiaNewsFromUpstream({
        endpoint: '/api/today',
        cursor: null,
        topic,
        limit,
      }).catch(() => ({ items: [] })),
    ])

    let payload = filterPayloadToArchiveWindow(mergeUniqueItems([
      filterPayloadByTopic(archiveUpstream, topic),
      filterPayloadByTopic(todayUpstream, topic),
    ], limit))

    // 업스트림 결과가 부족하면 저장소 데이터를 병합해 7일치 아카이브가 끊기지 않게 보강한다.
    if (payload.items.length < toSafeLimit(limit)) {
      const storedItems = await fallbackFromStore()
      if (storedItems.length > 0) {
        payload = {
          items: mergeArchiveItems([...payload.items, ...storedItems], limit),
        }
      }
    }

    if (payload.items.length === 0 && !topic && !cursor) {
      const bucketResults = await Promise.allSettled(
        TOPIC_BUCKETS.map((bucket) =>
          fetchRussiaNewsFromUpstream({
            endpoint: '/api/archive',
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
        writeCachedRussiaNews('archive', '', merged.items)
        await writeUpstashRussiaNews('archive', '', limit, cursor, merged.items)
        return NextResponse.json(merged, {
          headers: {
            'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=120',
          },
        })
      }
    }

    // 특정 카테고리에 데이터가 없으면 전체 아카이브 뉴스로 fallback
    if (payload.items.length === 0 && topic) {
      const broadPayload = filterPayloadToArchiveWindow(filterPayloadByTopic(
        await fetchRussiaNewsFromUpstream({
          endpoint: '/api/archive',
          cursor,
          topic: null,
          limit,
        }),
        topic
      ))
      if (broadPayload.items.length > 0) {
        writeCachedRussiaNews('archive', topic, broadPayload.items)
        await writeUpstashRussiaNews('archive', topic, limit, cursor, broadPayload.items)
        return NextResponse.json(broadPayload, {
          headers: {
            'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=120',
          },
        })
      }
    }

    if (payload.items.length > 0) {
      const mergedPayload = {
        items: mergeArchiveItems(payload.items, limit),
      }
      await saveRussiaNewsArchiveItems(mergedPayload.items)
      writeCachedRussiaNews('archive', topic, mergedPayload.items)
      await writeUpstashRussiaNews('archive', topic, limit, cursor, mergedPayload.items)
      return NextResponse.json(mergedPayload, {
        headers: {
          'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=120',
        },
      })
    }

    const storedItems = await fallbackFromStore()
    if (storedItems.length > 0) {
      writeCachedRussiaNews('archive', topic, storedItems)
      await writeUpstashRussiaNews('archive', topic, limit, cursor, storedItems)
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
      writeCachedRussiaNews('archive', topic, storedItems)
      await writeUpstashRussiaNews('archive', topic, limit, cursor, storedItems)
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
