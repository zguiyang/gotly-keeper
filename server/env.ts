import 'server-only'

import { serverEnvSchema } from '@/shared/env-schema'

const env = serverEnvSchema.parse(process.env)

export const serverEnv = {
  database: {
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DATABASE,
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    db: env.REDIS_DB,
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD,
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
} as const
