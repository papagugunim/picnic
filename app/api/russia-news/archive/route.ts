import { NextRequest, NextResponse } from 'next/server'

import { readCachedRussiaNews, writeCachedRussiaNews } from '@/lib/russia-news-cache'
import { getEmergencyFallbackNews } from '@/lib/russia-news-fallback'
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

function filterAndSortArchive(items: RussiaNewsApiPayload['items'], topicInput: string | null, limit: number) {
  const requested = normalizeTopic(topicInput)
  return items
    .filter((item) => isInArchiveWindow(item.published_at))
    .filter((item) => !requested || normalizeTopic(item.topic || null) === requested)
    .sort((a, b) => parsePublishedAtMs(b.published_at) - parsePublishedAtMs(a.published_at))
    .slice(0, toSafeLimit(limit))
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
      { status: 429, headers: { 'Retry-After': '30' } }
    )
  }

  try {
    // 1순위: Supabase 내부 아카이브 스토어
    const storedItems = await readRussiaNewsFromArchiveStore({ topic, limit, cursor })
    if (storedItems.length > 0) {
      writeCachedRussiaNews('archive', topic, storedItems)
      await writeUpstashRussiaNews('archive', topic, limit, cursor, storedItems)
      return NextResponse.json(
        { items: filterAndSortArchive(storedItems, topic, limit) },
        { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=120' } }
      )
    }

    // 2순위: Upstash / 메모리 캐시
    const cachedItems =
      readCachedRussiaNews('archive', topic, limit, cursor) ||
      (await readUpstashRussiaNews('archive', topic, limit, cursor)) ||
      readCachedRussiaNews('today', topic, limit, cursor) ||
      (await readUpstashRussiaNews('today', topic, limit, cursor))

    if (cachedItems && cachedItems.length > 0) {
      const sorted = filterAndSortArchive(cachedItems, topic, limit)
      if (sorted.length > 0) {
        return NextResponse.json(
          { items: sorted, stale: true, fallback: 'cache' },
          { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
        )
      }
    }

    // 토픽 지정 시 전체 캐시에서 필터링 재시도
    if (topic) {
      const broadCached =
        readCachedRussiaNews('archive', '', limit, cursor) ||
        (await readUpstashRussiaNews('archive', '', limit, cursor))
      if (broadCached && broadCached.length > 0) {
        const filtered = filterAndSortArchive(broadCached, topic, limit)
        if (filtered.length > 0) {
          return NextResponse.json(
            { items: filtered, stale: true, fallback: 'broad-cache' },
            { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
          )
        }
      }
    }

    // 최종 비상 폴백
    const emergencyItems = getEmergencyFallbackNews(topic, limit)
    return NextResponse.json(
      { items: emergencyItems, stale: true, fallback: 'emergency-static' },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
    )
  } catch (error) {
    const emergencyItems = getEmergencyFallbackNews(topic, limit)
    return NextResponse.json(
      { items: emergencyItems, stale: true, fallback: 'emergency-static', error: error instanceof Error ? error.message : 'unknown_error' },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
    )
  }
}
