import 'server-only'

import { serverEnv } from '@/server/lib/env'

export function isGithubAuthEnabled() {
  return Boolean(serverEnv.github.clientId && serverEnv.github.clientSecret)
}
