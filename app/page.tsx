import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold gradient-text">picnic</h1>
          <p className="text-xl text-muted-foreground">
            피크닉에 오신 여러분! 환영 합니다.
          </p>
          <p className="text-sm text-muted-foreground">
            해외 거주 한국인 교민을 위한 중고거래 및 커뮤니티 플랫폼 입니다.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="glass px-8 py-4 rounded-xl font-semibold hover:glass-strong transition-all"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all"
          >
            회원가입
          </Link>
        </div>

        <div className="pt-8 text-sm text-muted-foreground">
          <p>현재 지원 지역 : 러시아 모스크바, 상트페테르부르크</p>
        </div>
      </div>
    </div>
  );
}
