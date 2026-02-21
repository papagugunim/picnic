import { NextRequest, NextResponse } from 'next/server'

import { fetchRussiaNewsFromUpstream } from '@/lib/russia-news-proxy'
import { saveRussiaNewsArchiveItems, getRussiaNewsArchiveWindowDays } from '@/lib/russia-news-archive-store'
import type { RussiaNewsItem, RussiaNewsTopic } from '@/lib/russia-news'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOPIC_BUCKETS: RussiaNewsTopic[] = ['정치', '사회', '경제', '문화', '날씨']
const ALL_TOPICS: RussiaNewsTopic[] = ['', ...TOPIC_BUCKETS]
const WINDOW_MS = getRussiaNewsArchiveWindowDays() * 24 * 60 * 60 * 1000
const ARCHIVE_PAGE_LIMIT = 50
const TODAY_LIMIT = 30
const MAX_ARCHIVE_PAGES = 24

function parsePublishedAtMs(value: string): number {
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

function dedupeItems(items: RussiaNewsItem[]): RussiaNewsItem[] {
  const map = new Map<string, RussiaNewsItem>()
  for (const item of items) {
    const key = `${item.source_name}|${item.link}|${item.published_at}|${item.title_original || item.title}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  }
  return Array.from(map.values())
}

async function collectTodayNews(topic: RussiaNewsTopic): Promise<RussiaNewsItem[]> {
  const payload = await fetchRussiaNewsFromUpstream({
    endpoint: '/api/today-news',
    topic: topic || null,
    limit: TODAY_LIMIT,
  })
  return payload.items
}

async function collectArchiveWindow(topic: RussiaNewsTopic): Promise<RussiaNewsItem[]> {
  const windowStartMs = Date.now() - WINDOW_MS
  const collected: RussiaNewsItem[] = []
  let cursor: string | null = null

  for (let page = 0; page < MAX_ARCHIVE_PAGES; page += 1) {
    const payload = await fetchRussiaNewsFromUpstream({
      endpoint: '/api/archive',
      topic: topic || null,
      limit: ARCHIVE_PAGE_LIMIT,
      cursor,
    })

    const items = payload.items
    if (!items.length) break

    collected.push(...items)

    const oldestMsInPage = items.reduce((oldest, item) => {
      const publishedAtMs = parsePublishedAtMs(item.published_at)
      if (!publishedAtMs) return oldest
      if (!oldest) return publishedAtMs
      return Math.min(oldest, publishedAtMs)
    }, 0)

    if (oldestMsInPage && oldestMsInPage <= windowStartMs) {
      break
    }

    const nextCursor = items[items.length - 1]?.published_at || null
    if (!nextCursor || nextCursor === cursor) break
    cursor = nextCursor
  }

  return collected
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const diagnostics: Array<{ topic: RussiaNewsTopic; today: number; archive: number; error?: string }> = []
  const gathered: RussiaNewsItem[] = []

  for (const topic of ALL_TOPICS) {
    try {
      const [todayItems, archiveItems] = await Promise.all([
        collectTodayNews(topic),
        collectArchiveWindow(topic),
      ])

      diagnostics.push({
        topic,
        today: todayItems.length,
        archive: archiveItems.length,
      })

      gathered.push(...todayItems, ...archiveItems)
    } catch (error) {
      diagnostics.push({
        topic,
        today: 0,
        archive: 0,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    }
  }

  const deduped = dedupeItems(gathered)
  const saveResult = await saveRussiaNewsArchiveItems(deduped)
  const durationMs = Date.now() - startedAt

  return NextResponse.json({
    success: true,
    archive_window_days: getRussiaNewsArchiveWindowDays(),
    fetched_count: gathered.length,
    deduped_count: deduped.length,
    saved_count: saveResult.upsertedCount,
    pruned_count: saveResult.prunedCount,
    duration_ms: durationMs,
    diagnostics,
  })
}
