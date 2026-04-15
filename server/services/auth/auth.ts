import 'server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { db } from '@/server/lib/db'
import * as schema from '@/server/lib/db/schema'
import { serverEnv } from '@/server/lib/env'
import { createDefaultAvatarUrl } from '@/server/services/auth/avatar'

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
  user: {
    additionalFields: {
      role: {
        type: ['super_admin', 'user'],
        required: false,
        defaultValue: 'user',
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          return {
            data: {
              image: createDefaultAvatarUrl(),
            },
          }
        },
      },
    },
  },
})

export type AuthSession = typeof auth.$Infer.Session