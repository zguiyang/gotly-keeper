import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { Sidebar } from '@/components/workspace/sidebar'
import { TopAppBar } from '@/components/workspace/top-app-bar'
import { auth } from '@/server/auth/auth'

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  return (
    <>
      <Sidebar />
      <main className="min-h-screen lg:ml-64">
        <TopAppBar userImage={session.user.image} userName={session.user.name} />
        <div className="mx-auto px-4 sm:px-6 lg:px-12 pt-8 lg:pt-12 pb-24 max-w-6xl">
          {children}
        </div>
      </main>
    </>
  )
}
