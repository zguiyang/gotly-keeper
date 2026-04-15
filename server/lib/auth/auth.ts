import 'server-only'

import { randomUUID } from 'node:crypto'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { db } from '../db'
import * as schema from '../db/schema'
import { serverEnv } from '../env'

const DICEBEAR_AVATAR_URL = 'https://api.dicebear.com/9.x/bottts-neutral/png'

function createDefaultAvatarUrl(seed = randomUUID()) {
  const url = new URL(DICEBEAR_AVATAR_URL)
  url.searchParams.set('seed', seed)
  return url.toString()
}

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
