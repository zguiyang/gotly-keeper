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
      <main className="ml-64 min-h-screen">
        <TopAppBar userImage={session.user.image} userName={session.user.name} />
        <div className="max-w-4xl mx-auto px-12 pt-12 pb-24">
          {children}
        </div>
      </main>
    </>
  )
}
