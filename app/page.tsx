import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getAuthUserIdFast } from "@/lib/supabase/auth-performance";

export default async function HomePage() {
  // 로그인한 사용자는 feed로 리다이렉트
  const supabase = await createServerClient();
  const userId = await getAuthUserIdFast(supabase);

  if (userId) {
    redirect('/feed');
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-8 pt-10 pb-7">
      <div className="max-w-2xl w-full text-center space-y-8 mt-6">
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
      </div>

      <div className="w-full flex justify-center pb-1">
        <Image
          src="/branding/source/bread-color-original.jpg"
          alt="피크닉 브레드 아이콘"
          width={120}
          height={120}
          className="rounded-2xl shadow-sm"
          priority
        />
      </div>
    </div>
  );
}
