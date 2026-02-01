import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // 개발자 권한 확인 (회원 관리는 개발자만 접근 가능)
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || currentProfile.user_role !== 'developer') {
    return NextResponse.json({ error: '개발자만 접근 가능합니다.' }, { status: 403 })
  }

  // 쿼리 파라미터 파싱
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || 'all'
  const city = searchParams.get('city') || 'all'
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = 20

  const from = page * pageSize
  const to = from + pageSize - 1

  // 프로필 조회 쿼리 빌드
  let query = supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, city, user_role, bread_level, created_at, updated_at')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  if (role && role !== 'all') {
    query = query.eq('user_role', role)
  }

  if (city && city !== 'all') {
    query = query.eq('city', city)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    users: data || [],
    hasMore: (data || []).length === pageSize
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient()

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // 개발자 권한 확인 (회원 관리는 개발자만 접근 가능)
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || currentProfile.user_role !== 'developer') {
    return NextResponse.json({ error: '개발자만 접근 가능합니다.' }, { status: 403 })
  }

  const body = await request.json()
  const { userId, newRole } = body

  if (!userId || !newRole) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  // 개발자만 admin/developer 역할 부여 가능
  if (currentProfile.user_role !== 'developer' && (newRole === 'admin' || newRole === 'developer')) {
    return NextResponse.json({ error: '개발자만 admin/developer 역할을 부여할 수 있습니다.' }, { status: 403 })
  }

  // 자기 자신은 변경 불가
  if (userId === user.id) {
    return NextResponse.json({ error: '자신의 역할은 변경할 수 없습니다.' }, { status: 400 })
  }

  const levelMap: Record<string, number> = {
    developer: 7,
    admin: 6,
    user: 1,
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      user_role: newRole,
      bread_level: levelMap[newRole] || 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
