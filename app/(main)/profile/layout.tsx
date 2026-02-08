import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '프로필 | Picnic',
  description: '사용자 프로필 - 게시물, 동네생활 활동 내역',
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
