import 'server-only'

import { redis } from '@/server/lib/cache/redis'

export type QueueReceipt = {
  queueName: string
  processingQueueName: string
  rawPayload: string
}

export type ReservedQueueMessage<T> = {
  payload: T
  receipt: QueueReceipt
}

function getProcessingQueueName(queueName: string) {
  return `${queueName}:processing`
}

export async function enqueueQueueMessage<T>(queueName: string, payload: T): Promise<void> {
  await redis.lpush(queueName, JSON.stringify(payload))
}

export async function dequeueQueueMessage<T>(
  queueName: string,
  timeoutSeconds = 5
): Promise<ReservedQueueMessage<T> | null> {
  const processingQueueName = getProcessingQueueName(queueName)
  const rawPayload = await redis.brpoplpush(queueName, processingQueueName, timeoutSeconds)

  if (!rawPayload) {
    return null
  }

  try {
    return {
      payload: JSON.parse(rawPayload) as T,
      receipt: {
        queueName,
        processingQueueName,
        rawPayload,
      },
    }
  } catch (error) {
    console.error('[queue.service] failed to parse queue payload', {
      queueName,
      error: error instanceof Error ? error.message : String(error),
    })

    await acknowledgeQueueMessage({
      queueName,
      processingQueueName,
      rawPayload,
    })

    return null
  }
}

export async function acknowledgeQueueMessage(receipt: QueueReceipt): Promise<void> {
  await redis.lrem(receipt.processingQueueName, 1, receipt.rawPayload)
}

export async function releaseQueueMessage(receipt: QueueReceipt): Promise<void> {
  await redis.lrem(receipt.processingQueueName, 1, receipt.rawPayload)
  await redis.lpush(receipt.queueName, receipt.rawPayload)
}
