import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '동네생활 | Picnic',
  description: '러시아 한인 동네생활 커뮤니티 - 질문, 정보, 이벤트, 잡담을 나눠보세요',
}

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
