import webpush from 'web-push'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@mypicnic.vercel.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

/**
 * 특정 사용자에게 푸시 알림을 보내는 헬퍼 함수 (서버 사이드 전용)
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const supabase = await createServerClient()

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) return

  const payloadStr = JSON.stringify(payload)

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payloadStr
        )
      } catch (err: unknown) {
        // 만료된 구독 삭제
        if (err instanceof Error && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        }
      }
    })
  )
}

// POST /api/push/send - Supabase webhook 또는 내부 호출용
export async function POST(request: Request) {
  try {
    // 내부 호출 보안 확인
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, title, message, url } = body

    if (!userId || !title || !message) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
    }

    await sendPushToUser(userId, { title, body: message, url: url || '/' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Push] send error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
