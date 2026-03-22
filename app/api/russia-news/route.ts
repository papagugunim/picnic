import { NextRequest, NextResponse } from 'next/server'

import { readCachedRussiaNews, writeCachedRussiaNews } from '@/lib/russia-news-cache'
import { getEmergencyFallbackNews } from '@/lib/russia-news-fallback'
import { normalizeTopic, type RussiaNewsItem, type RussiaNewsTopic } from '@/lib/russia-news'
import { readUpstashRussiaNews, writeUpstashRussiaNews } from '@/lib/russia-news-upstash-cache'
import { isInArchiveWindow, readRussiaNewsFromArchiveStore, saveRussiaNewsArchiveItems } from '@/lib/russia-news-archive-store'
import { checkUpstashRateLimit, getRateLimitIdentifier } from '@/lib/upstash'
import { fetchFromExternalArchive } from '@/lib/russia-news-external-archive'

const TOPIC_BUCKETS: RussiaNewsTopic[] = ['정치', '사회', '경제', '문화', '날씨']

function filterByTopic<T extends { topic?: string | null }>(items: T[], topicInput: string | null): T[] {
  const requested = normalizeTopic(topicInput)
  if (!requested) return items
  return items.filter((item) => normalizeTopic(item.topic || null) === requested)
}

function filterToArchiveWindow<T extends { published_at?: string }>(items: T[]): T[] {
  return items.filter((item) => isInArchiveWindow(item.published_at ?? ''))
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const cursor = searchParams.get('cursor')
  const topic = searchParams.get('topic')
  const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || '20'), 50))
  const requester = getRateLimitIdentifier(request.headers, `russia-news:${topic || 'all'}`)

  const limitResult = await checkUpstashRateLimit('russia-news-api', requester, 180, 60)
  if (!limitResult.success) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { 'Retry-After': '30' } }
    )
  }

  try {
    // 1순위: rnews-archive.vercel.app 외부 아카이브
    if (!cursor) {
      const externalItems = await fetchFromExternalArchive({ limit, topic })
      if (externalItems.length > 0) {
        const filtered = filterToArchiveWindow(filterByTopic(externalItems, topic))
        if (filtered.length > 0) {
          await saveRussiaNewsArchiveItems(filtered)
          writeCachedRussiaNews('today', topic, filtered)
          await writeUpstashRussiaNews('today', topic, limit, cursor, filtered)
          return NextResponse.json(
            { items: filtered },
            { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
          )
        }
      }
    }

    // 2순위: Supabase 내부 아카이브 스토어
    const storedItems = await readRussiaNewsFromArchiveStore({ topic, limit, cursor })
    if (storedItems.length > 0) {
      writeCachedRussiaNews('today', topic, storedItems)
      await writeUpstashRussiaNews('today', topic, limit, cursor, storedItems)
      return NextResponse.json(
        { items: storedItems, stale: true, fallback: 'archive-store' },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
      )
    }

    // 3순위: Upstash / 메모리 캐시
    const cachedItems =
      readCachedRussiaNews('today', topic, limit, cursor) ||
      (await readUpstashRussiaNews('today', topic, limit, cursor)) ||
      readCachedRussiaNews('archive', topic, limit, cursor) ||
      (await readUpstashRussiaNews('archive', topic, limit, cursor))

    if (cachedItems && cachedItems.length > 0) {
      return NextResponse.json(
        { items: cachedItems, stale: true, fallback: 'cache' },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
      )
    }

    // 토픽 지정 시 전체 캐시에서 필터링 재시도
    if (topic) {
      const broadCached =
        readCachedRussiaNews('today', '', limit, cursor) ||
        (await readUpstashRussiaNews('today', '', limit, cursor))
      const filtered = filterByTopic(broadCached || [], topic)
      if (filtered.length > 0) {
        return NextResponse.json(
          { items: filtered, stale: true, fallback: 'broad-cache' },
          { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
        )
      }
    }

    // 4순위: 카테고리별 외부 아카이브 재시도 (전체 조회 실패 시)
    if (!cursor && !topic) {
      const bucketResults = await Promise.allSettled(
        TOPIC_BUCKETS.map((bucket) => fetchFromExternalArchive({ limit: 4, topic: bucket }))
      )
      const merged = new Map<string, RussiaNewsItem>()
      for (const result of bucketResults) {
        if (result.status !== 'fulfilled') continue
        for (const item of result.value) {
          if (!merged.has(item.id)) merged.set(item.id, item)
        }
      }
      const mergedItems = Array.from(merged.values()).slice(0, limit)
      if (mergedItems.length > 0) {
        await saveRussiaNewsArchiveItems(mergedItems)
        return NextResponse.json(
          { items: mergedItems, fallback: 'bucket-external' },
          { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300' } }
        )
      }
    }

    // 최종 비상 폴백
    const emergencyItems = getEmergencyFallbackNews(topic, limit)
    return NextResponse.json(
      { items: emergencyItems, stale: true, fallback: 'emergency-static' },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
    )
  } catch (error) {
    const storedItems = await readRussiaNewsFromArchiveStore({ topic, limit, cursor })
    if (storedItems.length > 0) {
      return NextResponse.json(
        { items: storedItems, stale: true, fallback: 'archive-store-on-error' },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
      )
    }
    const emergencyItems = getEmergencyFallbackNews(topic, limit)
    return NextResponse.json(
      { items: emergencyItems, stale: true, fallback: 'emergency-static', error: error instanceof Error ? error.message : 'unknown_error' },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
    )
  }
}
