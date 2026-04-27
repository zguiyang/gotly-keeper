import 'server-only'

import {
  acknowledgeQueueMessage,
  dequeueQueueMessage,
  enqueueQueueMessage,
  releaseQueueMessage,
} from '@/server/services/queue/queue.service'

import type { BookmarkEnrichTask } from './bookmark-enrich.contract'

const BOOKMARK_ENRICH_QUEUE_NAME = 'bookmark:enrich'

export async function enqueueBookmarkEnrichTask(task: BookmarkEnrichTask): Promise<void> {
  await enqueueQueueMessage(BOOKMARK_ENRICH_QUEUE_NAME, task)
}

export async function dequeueBookmarkEnrichTask(
  timeoutSeconds = 5
): Promise<{
  task: BookmarkEnrichTask
  acknowledge: () => Promise<void>
  release: () => Promise<void>
} | null> {
  const reserved = await dequeueQueueMessage<BookmarkEnrichTask>(BOOKMARK_ENRICH_QUEUE_NAME, timeoutSeconds)
  if (!reserved) {
    return null
  }

  return {
    task: reserved.payload,
    acknowledge: () => acknowledgeQueueMessage(reserved.receipt),
    release: () => releaseQueueMessage(reserved.receipt),
  }
}
