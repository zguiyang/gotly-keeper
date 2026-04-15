import { Sidebar } from '@/components/workspace/sidebar'
import { TopAppBar } from '@/components/workspace/top-app-bar'
import { requireWorkspaceUserOrRedirect } from '@/server/modules/auth/workspace-session'

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireWorkspaceUserOrRedirect()

  return (
    <>
      <Sidebar />
      <main className="min-h-screen lg:ml-64">
        <TopAppBar userImage={user.image} userName={user.name} />
        <div className="mx-auto px-4 sm:px-6 lg:px-12 pt-8 lg:pt-12 pb-24 max-w-6xl">
          {children}
        </div>
      </main>
    </>
  )
}
