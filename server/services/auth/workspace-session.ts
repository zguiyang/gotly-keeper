import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth, type AuthSession } from '@/server/services/auth/auth'

export type WorkspaceUser = AuthSession['user']

const getWorkspaceSessionInternal = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
})

export const getWorkspaceSession = async (): Promise<AuthSession | null> => {
  return getWorkspaceSessionInternal()
}

export const requireWorkspaceUserOrRedirect = async (): Promise<WorkspaceUser> => {
  const session = await getWorkspaceSessionInternal()

  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  return session.user
}
