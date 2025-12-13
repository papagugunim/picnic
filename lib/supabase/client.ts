import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Custom fetch wrapper to handle invalid values
const customFetch: typeof fetch = async (input, init) => {
  if (!init) {
    return window.fetch(input)
  }

  // Clean init object by removing all undefined/null values
  const cleanInit: RequestInit = {}

  // Copy method
  if (init.method) {
    cleanInit.method = init.method
  }

  // Clean and copy headers
  if (init.headers) {
    const headers: Record<string, string> = {}

    // Convert headers to plain object
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        if (value !== undefined && value !== null && value !== '') {
          headers[key] = value
        }
      })
    } else if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) {
        if (value !== undefined && value !== null && value !== '') {
          headers[key] = value
        }
      }
    } else {
      const headersObj = init.headers as Record<string, string | undefined | null>
      for (const [key, value] of Object.entries(headersObj)) {
        if (value !== undefined && value !== null && value !== '') {
          headers[key] = String(value)
        }
      }
    }

    if (Object.keys(headers).length > 0) {
      cleanInit.headers = headers
    }
  }

  // Copy body
  if (init.body !== undefined && init.body !== null) {
    cleanInit.body = init.body
  }

  // Copy other common properties
  if (init.mode) cleanInit.mode = init.mode
  if (init.credentials) cleanInit.credentials = init.credentials
  if (init.cache) cleanInit.cache = init.cache
  if (init.redirect) cleanInit.redirect = init.redirect
  if (init.referrer) cleanInit.referrer = init.referrer
  if (init.integrity) cleanInit.integrity = init.integrity

  return window.fetch(input, cleanInit)
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
