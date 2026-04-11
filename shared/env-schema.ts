import { z } from 'zod'

export const publicEnvSchema = z.object({})

export const serverOnlyEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
})

export const serverEnvSchema = publicEnvSchema.merge(serverOnlyEnvSchema)

export type PublicEnvShape = z.infer<typeof publicEnvSchema>
export type ServerEnvShape = z.infer<typeof serverEnvSchema>
