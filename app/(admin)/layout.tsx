import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/feed')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, user_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'developer'].includes(profile.user_role || '')) {
    redirect('/feed')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader
        userName={profile.full_name || '관리자'}
        userRole={profile.user_role as 'admin' | 'developer'}
        avatarUrl={profile.avatar_url}
      />
      <div className="flex">
        <AdminNav />
        <main className="flex-1 p-3 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
