import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { verifyCityByGps, type GeoSample, type SupportedCity } from '@/lib/city-verification'

type VerifyRequestBody = {
  city: SupportedCity
  samples: GeoSample[]
}

function isSupportedCity(value: string): value is SupportedCity {
  return value === 'moscow' || value === 'spb'
}

export async function POST(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const body = (await request.json()) as Partial<VerifyRequestBody>
  if (!body.city || !isSupportedCity(body.city)) {
    return NextResponse.json({ error: '도시 정보가 올바르지 않습니다.' }, { status: 400 })
  }

  if (!Array.isArray(body.samples) || body.samples.length === 0) {
    return NextResponse.json({ error: 'GPS 샘플이 부족합니다.' }, { status: 400 })
  }

  const result = verifyCityByGps(body.city, body.samples)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      city_verification_status: result.pass ? 'verified' : 'retry_required',
      city_verification_score: result.score,
      city_verification_method: 'gps',
      city_verification_distance_km: result.distanceKm,
      city_verification_accuracy_m: result.avgAccuracyM,
      city_verification_last_checked_at: new Date().toISOString(),
      city_verified_at: result.pass ? new Date().toISOString() : null,
      city_verification_attempts: result.sampleCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: '검증 결과 저장에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    result,
  })
}
