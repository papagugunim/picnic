import { redirect } from 'next/navigation'

type CallbackClientPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AuthCallbackClientPage({ searchParams }: CallbackClientPageProps) {
  const resolvedSearchParams = (await searchParams) || {}
  const callbackParams = new URLSearchParams()

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach((item) => callbackParams.append(key, item))
    } else {
      callbackParams.append(key, value)
    }
  })

  const query = callbackParams.toString()
  redirect(query ? `/auth/callback?${query}` : '/auth/callback')
}
