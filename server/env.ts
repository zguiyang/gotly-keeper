import 'server-only'

import { serverEnvSchema } from '@/shared/env-schema'

const env = serverEnvSchema.parse(process.env)

export const serverEnv = {
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
} as const
