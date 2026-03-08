import type { Metadata } from 'next'
import Link from 'next/link'

import styles from './page.module.css'

export const metadata: Metadata = {
  title: '로고 애니메이션 미리보기 | Picnic',
  description: '피크닉 로고 애니메이션 효과 비교 페이지',
}

const effects = [
  { key: 'rise', title: 'Bread Rise', desc: '살짝 위로 올라오며 페이드 인' },
  { key: 'wave', title: 'Milk Wave', desc: '하이라이트가 좌→우로 지나감' },
  { key: 'glow', title: 'Soft Glow Pulse', desc: '은은한 호흡형 빛 효과' },
  { key: 'stagger', title: 'Letter Stagger', desc: '글자 순차 등장' },
  { key: 'tilt', title: 'Tilt Micro Hover', desc: '호버 시 미세 기울기' },
  { key: 'underline', title: 'Underline Draw', desc: '밑줄이 그려지는 효과' },
]

export default function LogoEffectsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">피크닉 로고 애니메이션 미리보기</h1>
          <p className="text-sm text-muted-foreground">원하시는 스타일을 고르시면 실제 로그인/홈에 바로 적용하겠습니다.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {effects.map((effect) => (
            <div key={effect.key} className="rounded-xl border border-border p-4 bg-card">
              <div className="text-xs text-muted-foreground mb-2">{effect.title}</div>
              <div className="h-16 flex items-center justify-center rounded-lg bg-muted/30 overflow-hidden">
                {effect.key === 'stagger' ? (
                  <h2 className={`text-3xl font-bold home-hero-title ${styles.staggerWrap}`}>
                    <span>피</span><span>크</span><span>닉</span>
                  </h2>
                ) : (
                  <h2 className={`text-3xl font-bold home-hero-title ${styles[effect.key]}`}>피크닉</h2>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{effect.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-sm text-primary hover:underline">홈으로 돌아가기</Link>
        </div>
      </div>
    </div>
  )
}
