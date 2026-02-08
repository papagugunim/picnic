import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '설정 | Picnic',
  description: '프로필, 테마, 도시, 지하철역 설정',
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
