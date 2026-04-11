import { publicEnvSchema } from './env-schema'

export const publicEnv = publicEnvSchema.parse(process.env)

export type PublicEnv = typeof publicEnv
