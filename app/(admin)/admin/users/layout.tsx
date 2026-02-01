import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single()

  // 개발자만 회원 관리 페이지 접근 가능
  if (!profile || profile.user_role !== 'developer') {
    redirect('/admin')
  }

  return <>{children}</>
}
