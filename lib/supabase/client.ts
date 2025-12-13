import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Custom fetch wrapper to handle invalid header values
const customFetch: typeof fetch = async (input, init) => {
  // Clean headers by removing undefined/null values
  let cleanHeaders: HeadersInit | undefined = undefined

  if (init?.headers) {
    const headers: Record<string, string> = {}
    const headersObj = init.headers as Record<string, string | undefined | null>

    for (const [key, value] of Object.entries(headersObj)) {
      // Only include headers with valid string values
      if (value !== undefined && value !== null && value !== '') {
        headers[key] = value
      }
    }

    cleanHeaders = headers
  }

  const cleanInit = init ? {
    ...init,
    headers: cleanHeaders,
  } : undefined

  return fetch(input, cleanInit)
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Client] 환경 변수 누락!')
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file or Vercel environment variables.'
    )
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: customFetch,
    },
  })
}
