import dynamic from 'next/dynamic'

import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import MainContent from '@/components/layout/MainContent'
import { UserProvider } from '@/lib/contexts/UserContext'

const NotificationBridge = dynamic(() => import('@/components/notifications/NotificationBridge'), {
  loading: () => null,
})
const ProfileWarmup = dynamic(
  () => import('@/components/profile/ProfileWarmup').then((module) => module.ProfileWarmup),
  { loading: () => null }
)
const RussiaNewsWarmup = dynamic(
  () => import('@/components/today/RussiaNewsWarmup').then((module) => module.RussiaNewsWarmup),
  { loading: () => null }
)

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserProvider>
      <NotificationBridge />
      <ProfileWarmup />
      <RussiaNewsWarmup />
      <div className="min-h-screen bg-background">
        <TopBar />

        <MainContent>
          {children}
        </MainContent>

        <BottomNav />
      </div>
    </UserProvider>
  )
}
