import { headers } from 'next/headers'

import { auth, type AuthSession } from '../../lib/auth'
import { ModuleActionError, MODULE_ACTION_ERROR_CODES } from '../actions/action-error'

export type CurrentUser = AuthSession['user']

export async function getSignedInUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return session?.user ?? null
}

export async function requireSignedInUser(): Promise<CurrentUser> {
  const user = await getSignedInUser()

  if (!user) {
    throw new ModuleActionError('请先登录。', MODULE_ACTION_ERROR_CODES.UNAUTHENTICATED)
  }

  return user
}
