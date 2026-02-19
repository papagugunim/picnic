import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BATCH_SIZE = 20
const MAX_RETRY_COUNT = 5
const NEW_MESSAGE_EMAIL_DELAY_MINUTES = 3

interface EmailQueueRow {
  id: number
  notification_id: string
  user_id: string
  user_email: string
  subject: string
  message: string
  link: string | null
  retry_count: number
  created_at: string
}

interface NotificationMetaRow {
  id: string
  type: string
  is_read: boolean
  related_room_id: string | null
}

function resolveLink(link: string | null, origin: string) {
  if (!link) return null
  if (link.startsWith('http://') || link.startsWith('https://')) {
    return link
  }
  return `${origin}${link}`
}

function getRetryDelayMinutes(retryCount: number) {
  return Math.min(30, 5 * retryCount)
}

function buildEmailPayload(row: EmailQueueRow, origin: string) {
  const destinationLink = resolveLink(row.link, origin)
  const safeMessage = row.message.replace(/\n/g, '<br />')

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="font-size: 18px; margin-bottom: 8px;">${row.subject}</h2>
      <p style="font-size: 14px; margin: 0 0 12px;">${safeMessage}</p>
      ${destinationLink ? `<p style="margin: 0 0 16px;"><a href="${destinationLink}" style="color: #2563eb; text-decoration: none;">피크닉에서 확인하기</a></p>` : ''}
      <p style="font-size: 12px; color: #6b7280; margin: 0;">이 메일은 피크닉 알림 요약입니다.</p>
    </div>
  `

  const text = destinationLink
    ? `${row.message}\n\n확인 링크: ${destinationLink}\n\n이 메일은 피크닉 알림 요약입니다.`
    : `${row.message}\n\n이 메일은 피크닉 알림 요약입니다.`

  return { html, text }
}

async function markAsSent(
  supabase: ReturnType<typeof createAdminClient>,
  rowId: number,
  note: string | null = null
) {
  await supabase
    .from('notification_email_queue')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      last_error: note,
    })
    .eq('id', rowId)
}

async function scheduleForLater(
  supabase: ReturnType<typeof createAdminClient>,
  rowId: number,
  nextAttemptAt: string,
  note: string
) {
  await supabase
    .from('notification_email_queue')
    .update({
      status: 'pending',
      next_attempt_at: nextAttemptAt,
      last_error: note.slice(0, 500),
    })
    .eq('id', rowId)
}

async function markAsFailedOrRetry(
  supabase: ReturnType<typeof createAdminClient>,
  row: EmailQueueRow,
  errorMessage: string
) {
  const nextRetryCount = row.retry_count + 1
  const shouldFail = nextRetryCount >= MAX_RETRY_COUNT
  const nextAttemptAt = new Date(Date.now() + getRetryDelayMinutes(nextRetryCount) * 60 * 1000).toISOString()

  await supabase
    .from('notification_email_queue')
    .update({
      status: shouldFail ? 'failed' : 'pending',
      retry_count: nextRetryCount,
      last_error: errorMessage.slice(0, 500),
      next_attempt_at: nextAttemptAt,
    })
    .eq('id', row.id)
}

function getRemainingNewMessageDelayMs(createdAt: string) {
  const elapsedMs = Date.now() - new Date(createdAt).getTime()
  const delayMs = NEW_MESSAGE_EMAIL_DELAY_MINUTES * 60 * 1000
  return delayMs - elapsedMs
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.NOTIFICATION_EMAIL_FROM
  const appOrigin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

  if (!resendApiKey || !emailFrom) {
    return NextResponse.json(
      {
        success: false,
        skipped: true,
        reason: 'Missing RESEND_API_KEY or NOTIFICATION_EMAIL_FROM',
      },
      { status: 200 }
    )
  }

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Missing Supabase admin environment variables'
    return NextResponse.json(
      {
        success: false,
        skipped: true,
        reason: message,
      },
      { status: 200 }
    )
  }
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('notification_email_queue')
    .select('id, notification_id, user_id, user_email, subject, message, link, retry_count, created_at')
    .eq('status', 'pending')
    .lte('next_attempt_at', now)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const queueRows = (data || []) as EmailQueueRow[]
  if (queueRows.length === 0) {
    return NextResponse.json({ success: true, processed: 0, sent: 0, failed: 0 })
  }

  const notificationIds = queueRows.map((row) => row.notification_id)
  const { data: notificationData, error: notificationError } = await supabase
    .from('notifications')
    .select('id, type, is_read, related_room_id')
    .in('id', notificationIds)

  if (notificationError) {
    return NextResponse.json({ error: notificationError.message }, { status: 500 })
  }

  const notificationMetaMap = new Map(
    ((notificationData || []) as NotificationMetaRow[]).map((row) => [row.id, row])
  )

  const newestMessageQueueByRoom = new Map<string, EmailQueueRow>()
  for (const row of queueRows) {
    const meta = notificationMetaMap.get(row.notification_id)
    if (!meta || meta.type !== 'new_message' || !meta.related_room_id) {
      continue
    }

    const dedupeKey = `${row.user_id}:${meta.related_room_id}`
    const existing = newestMessageQueueByRoom.get(dedupeKey)
    if (!existing || new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
      newestMessageQueueByRoom.set(dedupeKey, row)
    }
  }

  let sent = 0
  let failed = 0
  let suppressed = 0
  let deferred = 0

  for (const row of queueRows) {
    if (!row.user_email) {
      failed += 1
      await markAsFailedOrRetry(supabase, row, 'Missing recipient email')
      continue
    }

    const notificationMeta = notificationMetaMap.get(row.notification_id)
    if (!notificationMeta) {
      failed += 1
      await markAsFailedOrRetry(supabase, row, 'Notification metadata not found')
      continue
    }

    if (notificationMeta.is_read) {
      suppressed += 1
      await markAsSent(supabase, row.id, 'Skipped: already read')
      continue
    }

    if (notificationMeta.type === 'new_message') {
      if (notificationMeta.related_room_id) {
        const dedupeKey = `${row.user_id}:${notificationMeta.related_room_id}`
        const latestRow = newestMessageQueueByRoom.get(dedupeKey)
        if (latestRow && latestRow.id !== row.id) {
          suppressed += 1
          await markAsSent(supabase, row.id, 'Skipped: newer message notification exists')
          continue
        }
      }

      const remainingDelayMs = getRemainingNewMessageDelayMs(row.created_at)
      if (remainingDelayMs > 0) {
        const nextAttemptAt = new Date(Date.now() + remainingDelayMs).toISOString()
        deferred += 1
        await scheduleForLater(
          supabase,
          row.id,
          nextAttemptAt,
          `Deferred: wait ${NEW_MESSAGE_EMAIL_DELAY_MINUTES}m window`
        )
        continue
      }
    }

    try {
      const payload = buildEmailPayload(row, appOrigin)
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [row.user_email],
          subject: row.subject,
          html: payload.html,
          text: payload.text,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        failed += 1
        await markAsFailedOrRetry(supabase, row, `Resend API error (${response.status}): ${errorText}`)
        continue
      }

      sent += 1
      await markAsSent(supabase, row.id)
    } catch (err) {
      failed += 1
      const message = err instanceof Error ? err.message : 'Unknown email error'
      await markAsFailedOrRetry(supabase, row, message)
    }
  }

  return NextResponse.json({
    success: true,
    processed: queueRows.length,
    sent,
    failed,
    suppressed,
    deferred,
  })
}
