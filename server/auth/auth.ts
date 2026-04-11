import 'server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { db } from '@/server/db'
import * as schema from '@/server/db/schema'
import { serverEnv } from '@/server/env'

export const auth = betterAuth({
  appName: 'Gotly AI',
  baseURL: serverEnv.auth.url,
  secret: serverEnv.auth.secret,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
})

export type AuthSession = typeof auth.$Infer.Session