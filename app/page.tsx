import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // 로그인한 사용자는 feed로 리다이렉트
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/feed');
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-brand font-bold home-hero-title">picnic</h1>
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
      </div>
    </div>
  );
}
