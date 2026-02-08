import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '검색 | Picnic',
  description: '중고거래, 동네생활 게시글 검색',
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
