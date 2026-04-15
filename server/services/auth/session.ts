import 'server-only'

import { headers } from 'next/headers'

import { ActionError, ACTION_ERROR_CODES } from '@/server/services/actions/action-error'
import { auth, type AuthSession } from '@/server/services/auth/auth'

export type CurrentUser = AuthSession['user']

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return session?.user ?? null
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()

  if (!user) {
    throw new ActionError('请先登录。', ACTION_ERROR_CODES.UNAUTHENTICATED)
  }

  return user
}