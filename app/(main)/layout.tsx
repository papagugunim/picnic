import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <main className="pb-20 max-w-screen-xl mx-auto">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
