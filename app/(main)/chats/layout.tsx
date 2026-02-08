import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '채팅 | Picnic',
  description: '거래 상대와 실시간 채팅',
}

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
