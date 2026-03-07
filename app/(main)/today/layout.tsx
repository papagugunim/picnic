import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '오늘 | Picnic',
  description: '날씨, 환율, 뉴스 등 해외 거주 한국인을 위한 오늘의 정보',
}

export default function TodayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
