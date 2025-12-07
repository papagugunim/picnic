import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LocationOnboarding from '@/components/onboarding/LocationOnboarding'

export const metadata = {
  title: '위치 설정 - picnic',
  description: '거주 지역을 설정하세요',
}

export default async function OnboardingPage() {
  const supabase = await createClient()

  // 로그인 확인
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 이미 프로필이 있는지 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('city, neighborhood')
    .eq('id', user.id)
    .single()

  // 이미 위치 정보가 있으면 feed로 리디렉트
  if (profile?.city && profile?.neighborhood) {
    redirect('/feed')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <LocationOnboarding userId={user.id} />
    </div>
  )
}
