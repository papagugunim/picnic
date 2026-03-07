import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '동네생활 | Picnic',
  description: '해외 거주 도시 기반 한국인 교민 커뮤니티 - 질문, 정보, 이벤트, 잡담을 나눠보세요',
}

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
