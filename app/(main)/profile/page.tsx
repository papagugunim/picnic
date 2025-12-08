'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MyProfilePage() {
  const router = useRouter()

  useEffect(() => {
    async function redirectToProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      router.push('/profile/' + user.id)
    }

    redirectToProfile()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  )
}
