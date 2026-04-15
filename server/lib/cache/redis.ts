import 'server-only'

import chalk from 'chalk'
import Redis from 'ioredis'

import { serverEnv } from '@/server/lib/env'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedis() {
  const client = new Redis({
    ...serverEnv.redis,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })

  console.info(chalk.green('[redis] Redis client initialized'))

  client.once('connect', () => {
    console.info(chalk.green('[redis] Redis connected'))
  })

  client.on('error', (error) => {
    console.error(chalk.red('[redis] Redis connection error'), error)
  })

  return client
}

export const redis = globalForRedis.redis ?? createRedis()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

export async function checkRedisConnection() {
  await redis.ping()
  console.info(chalk.green('[redis] Redis ping succeeded'))
}
