import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/push/subscribe - 푸시 구독 저장
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    }

    const subscription = await request.json()
    const { endpoint, keys } = subscription

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: '잘못된 구독 정보' }, { status: 400 })
    }

    // upsert: 같은 endpoint면 업데이트
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('[Push] 구독 저장 실패:', error)
      return NextResponse.json({ error: '저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Push] subscribe error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// DELETE /api/push/subscribe - 푸시 구독 삭제
export async function DELETE() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    }

    await supabase.from('push_subscriptions').delete().eq('user_id', user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Push] unsubscribe error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
