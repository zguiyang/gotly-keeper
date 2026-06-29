import 'server-only'

import { serverEnvSchema } from '@/shared/env-schema'

const env = serverEnvSchema.parse(process.env)

export const serverEnv = {
  database: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
    keyPrefix: env.REDIS_KEY_PREFIX,
  },
  auth: {
    secret: env.BETTER_AUTH_SECRET,
    url: env.BETTER_AUTH_URL,
  },
  aiGateway: {
    apiKey: env.AI_GATEWAY_API_KEY,
    url: env.AI_GATEWAY_URL,
    modelName: env.AI_MODEL_NAME,
    embeddingModelName: env.AI_EMBEDDING_MODEL_NAME,
    embeddingDimensions: env.AI_EMBEDDING_DIMENSIONS,
  },
  resend: {
    key: env.RESEND_KEY,
  },
  github: {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  },
} as const
