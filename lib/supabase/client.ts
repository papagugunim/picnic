import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 디버깅: 환경 변수 확인
  console.log('[Supabase Client] URL:', supabaseUrl ? '존재함' : '없음')
  console.log('[Supabase Client] Key:', supabaseAnonKey ? '존재함' : '없음')
  console.log('[Supabase Client] URL 값:', supabaseUrl)
  console.log('[Supabase Client] URL 타입:', typeof supabaseUrl)
  console.log('[Supabase Client] URL 길이:', supabaseUrl?.length)

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Client] 환경 변수 누락!')
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file or Vercel environment variables.'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
