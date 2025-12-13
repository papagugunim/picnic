import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Custom fetch wrapper to debug and handle errors
const customFetch: typeof fetch = async (input, init) => {
  console.log('[Custom Fetch] Input:', input)
  console.log('[Custom Fetch] Init:', init)

  // Ensure all values are valid
  const cleanInit = init ? {
    ...init,
    headers: init.headers ? new Headers(init.headers) : undefined,
  } : undefined

  try {
    return await fetch(input, cleanInit)
  } catch (error) {
    console.error('[Custom Fetch] Error:', error)
    throw error
  }
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
