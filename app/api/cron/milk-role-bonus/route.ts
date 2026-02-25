import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getMoscowDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const day = parts.find((part) => part.type === 'day')?.value ?? ''

  return `${year}-${month}-${day}`
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const runDate = getMoscowDateString()

  const { data, error } = await supabase.rpc('award_daily_milk_role_bonus', {
    p_run_date: runDate,
  })

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        run_date: runDate,
      },
      { status: 500 }
    )
  }

  const row = Array.isArray(data) ? data[0] : null

  return NextResponse.json({
    success: true,
    run_date: row?.run_date ?? runDate,
    awarded_developers: Number(row?.awarded_developers ?? 0),
    awarded_admins: Number(row?.awarded_admins ?? 0),
    total_awarded_points: Number(row?.total_awarded_points ?? 0),
  })
}

