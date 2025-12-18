import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import { UserProvider } from '@/lib/contexts/UserContext'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserProvider>
      <div className="min-h-screen bg-background">
        <TopBar />

        <main className="pb-20 max-w-screen-xl mx-auto">
          {children}
        </main>

        <BottomNav />
      </div>
    </UserProvider>
  )
}
