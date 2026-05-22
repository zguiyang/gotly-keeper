import 'server-only'

import { randomUUID } from 'node:crypto'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { Resend } from 'resend'

import { db } from '../db'
import * as schema from '../db/schema'
import { serverEnv } from '../env'

const DICEBEAR_AVATAR_URL = 'https://api.dicebear.com/9.x/bottts-neutral/png'

function createDefaultAvatarUrl(seed = randomUUID()) {
  const url = new URL(DICEBEAR_AVATAR_URL)
  url.searchParams.set('seed', seed)
  return url.toString()
}

const resend = serverEnv.resend.key ? new Resend(serverEnv.resend.key) : null

export const auth = betterAuth({
  appName: 'Gotly Keeper',
  baseURL: serverEnv.auth.url,
  secret: serverEnv.auth.secret,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),
  socialProviders: {
    ...(serverEnv.github.clientId && serverEnv.github.clientSecret
      ? {
          github: {
            clientId: serverEnv.github.clientId,
            clientSecret: serverEnv.github.clientSecret,
          },
        }
      : {}),
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      if (!resend) return

      void resend.emails.send({
        from: 'Gotly Keeper <noreply@mail.zhaoguiyang.com>',
        to: user.email,
        subject: 'Reset your password',
        text: `Click the link below to reset your password: ${url}`,
      })
    },
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
