import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthUserIdFast } from "@/lib/supabase/auth-performance";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) || {}

  // 일부 OAuth 환경에서 code가 '/'로 돌아올 수 있어 콜백 라우트로 강제 전달
  const hasAuthParams = Boolean(
    resolvedSearchParams.code ||
    resolvedSearchParams.token_hash ||
    resolvedSearchParams.error ||
    resolvedSearchParams.error_description
  )

  if (hasAuthParams) {
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
    // 우선 브라우저 PKCE 콜백으로 처리하고, 필요 시 내부적으로 서버 콜백으로 fallback
    redirect(query ? `/auth/callback-client?${query}` : '/auth/callback-client')
  }

  // 로그인한 사용자는 feed로 리다이렉트
  const supabase = await createServerClient();
  const userId = await getAuthUserIdFast(supabase);

  if (userId) {
    redirect('/feed');
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-8 py-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold home-hero-title">피크닉</h1>
          <p className="text-xl text-muted-foreground">
            피크닉에 오신 여러분! 환영 합니다.
          </p>
          <p className="text-sm text-muted-foreground">
            해외 거주 도시 기반 한국인 교민 플랫폼
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="glass px-8 py-3 rounded-xl font-semibold hover:glass-strong transition-all"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all"
          >
            회원가입
          </Link>
        </div>

        <div className="w-full flex justify-center pt-1">
          <Image
            src="/branding/external/bread-from-user-transparent.png"
            alt="피크닉 브레드 아이콘"
            width={44}
            height={44}
            className="block"
            priority
          />
        </div>
      </div>
    </div>
  );
}
