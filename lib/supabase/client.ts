import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// 싱글톤 인스턴스
let client: SupabaseClient | null = null

export function createClient() {
  // 이미 생성된 클라이언트가 있으면 재사용
  if (client) {
    return client
  }

  // 새로운 클라이언트 생성 및 캐싱
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
        },
        set(name: string, value: string, options: any) {
          let cookieString = `${name}=${encodeURIComponent(value)}; path=/`
          if (options?.maxAge) {
            cookieString += `; max-age=${options.maxAge}`
          }
          if (options?.sameSite) {
            cookieString += `; samesite=${options.sameSite}`
          }
          if (options?.secure) {
            cookieString += '; secure'
          }
          document.cookie = cookieString
        },
        remove(name: string) {
          document.cookie = `${name}=; path=/; max-age=0`
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10, // 초당 최대 10개 이벤트
        },
      },
      global: {
        headers: {
          'x-client-info': 'picnic-web@1.0.0',
        },
      },
    }
  )

  return client
}
