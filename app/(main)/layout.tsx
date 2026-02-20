import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import MainContent from '@/components/layout/MainContent'
import NotificationBridge from '@/components/notifications/NotificationBridge'
import { ProfileWarmup } from '@/components/profile/ProfileWarmup'
import { RussiaNewsWarmup } from '@/components/today/RussiaNewsWarmup'
import { UserProvider } from '@/lib/contexts/UserContext'

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
