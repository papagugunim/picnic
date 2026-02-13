import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// 싱글톤 인스턴스
let client: SupabaseClient | null = null

const isBrowser = typeof window !== 'undefined'

export function createClient() {
  // SSR 단계(클라이언트 컴포넌트의 서버 렌더 포함)에서는
  // document/localStorage 접근 없이 안전한 임시 클라이언트를 반환
  if (!isBrowser) {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() {
            return null
          },
          set() {},
          remove() {},
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        global: {
          headers: {
            'x-client-info': 'picnic-web@1.0.0',
          },
        },
      }
    )
  }

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
          if (typeof document === 'undefined') return null
          const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return
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
          if (typeof document === 'undefined') return
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
