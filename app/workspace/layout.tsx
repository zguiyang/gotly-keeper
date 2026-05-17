import { MobileBottomNav } from '@/components/workspace/mobile-bottom-nav'
import { Sidebar } from '@/components/workspace/sidebar'
import { TopAppBar } from '@/components/workspace/top-app-bar'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireWorkspaceUserAccess()

  return (
    <>
      <Sidebar />
      <main className="min-h-screen min-h-dvh lg:ml-64">
        <TopAppBar userEmail={user.email} userImage={user.image} userName={user.name} />
        <div className="mx-auto px-4 sm:px-6 lg:px-12 pt-[4.5rem] lg:pt-[5.5rem] pb-32 lg:pb-12 max-w-6xl">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </>
  )
}
