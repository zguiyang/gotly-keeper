import 'server-only'

import { redis } from '@/server/lib/cache/redis'

export async function enqueueQueueMessage<T>(queueName: string, payload: T): Promise<void> {
  await redis.lpush(queueName, JSON.stringify(payload))
}

export async function dequeueQueueMessage<T>(
  queueName: string,
  timeoutSeconds = 5
): Promise<T | null> {
  const popped = await redis.brpop(queueName, timeoutSeconds)

  if (!popped || popped.length < 2) {
    return null
  }

  try {
    return JSON.parse(popped[1]) as T
  } catch (error) {
    console.error('[queue.service] failed to parse queue payload', {
      queueName,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

