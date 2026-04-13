import { z } from 'zod'

export const publicEnvSchema = z.object({})

const optionalNonEmptyString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))

export const serverOnlyEnvSchema = z.object({
  POSTGRES_HOST: z.string().min(1, 'POSTGRES_HOST is required'),
  POSTGRES_PORT: z.coerce.number().int().positive('POSTGRES_PORT must be a positive integer'),
  POSTGRES_USER: z.string().min(1, 'POSTGRES_USER is required'),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DATABASE: z.string().min(1, 'POSTGRES_DATABASE is required'),

  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z.coerce.number().int().positive('REDIS_PORT must be a positive integer'),
  REDIS_DB: z.coerce.number().int().nonnegative('REDIS_DB must be zero or greater').default(0),
  REDIS_USERNAME: optionalNonEmptyString,
  REDIS_PASSWORD: optionalNonEmptyString,

  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),

  AI_GATEWAY_API_KEY: optionalNonEmptyString,
  AI_GATEWAY_URL: optionalNonEmptyString.pipe(
    z.string().url('AI_GATEWAY_URL must be a valid URL').optional()
  ),
  AI_MODEL_NAME: optionalNonEmptyString,

  AI_EMBEDDING_MODEL_NAME: optionalNonEmptyString,
  AI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().optional(),
})

export const serverEnvSchema = publicEnvSchema.merge(serverOnlyEnvSchema)

export type PublicEnvShape = z.infer<typeof publicEnvSchema>
export type ServerEnvShape = z.infer<typeof serverEnvSchema>
