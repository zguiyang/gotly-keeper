import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { auth, type AuthSession } from '../../lib/auth'

export type WorkspaceUser = AuthSession['user']

export async function getWorkspaceUserSession() {
  const session = await getWorkspaceSessionInternal()
  return session
}

export async function requireWorkspaceUserAccess(): Promise<WorkspaceUser> {
  const session = await getWorkspaceSessionInternal()

  if (!session?.user) {
    redirect('/auth/sign-in')
  }

  return session.user
}

const getWorkspaceSessionInternal = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
})
