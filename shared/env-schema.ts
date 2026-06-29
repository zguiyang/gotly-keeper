import { z } from 'zod'

export const publicEnvSchema = z.object({})

const optionalNonEmptyString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))

export const serverOnlyEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  REDIS_KEY_PREFIX: optionalNonEmptyString,

  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),

  AI_GATEWAY_API_KEY: optionalNonEmptyString,
  AI_GATEWAY_URL: optionalNonEmptyString.pipe(
    z.string().url('AI_GATEWAY_URL must be a valid URL').optional()
  ),
  AI_MODEL_NAME: optionalNonEmptyString,

  AI_EMBEDDING_MODEL_NAME: optionalNonEmptyString,
  AI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().optional(),

  RESEND_KEY: optionalNonEmptyString,

  GITHUB_CLIENT_ID: optionalNonEmptyString,
  GITHUB_CLIENT_SECRET: optionalNonEmptyString,
})

export const serverEnvSchema = publicEnvSchema.merge(serverOnlyEnvSchema)

export type PublicEnvShape = z.infer<typeof publicEnvSchema>
export type ServerEnvShape = z.infer<typeof serverEnvSchema>
