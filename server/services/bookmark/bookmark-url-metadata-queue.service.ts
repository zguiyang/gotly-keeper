import 'server-only'

import {
  acknowledgeQueueMessage,
  dequeueQueueMessage,
  enqueueQueueMessage,
  releaseQueueMessage,
} from '@/server/services/queue/queue.service'

import type { BookmarkUrlMetadataTask } from './bookmark-url-metadata.contract'

const BOOKMARK_URL_METADATA_QUEUE_NAME = 'bookmark:enrich'

export async function enqueueBookmarkUrlMetadataTask(task: BookmarkUrlMetadataTask): Promise<void> {
  await enqueueQueueMessage(BOOKMARK_URL_METADATA_QUEUE_NAME, task)
}

export async function dequeueBookmarkUrlMetadataTask(
  timeoutSeconds = 5
): Promise<{
  task: BookmarkUrlMetadataTask
  acknowledge: () => Promise<void>
  release: () => Promise<void>
} | null> {
  const reserved = await dequeueQueueMessage<BookmarkUrlMetadataTask>(
    BOOKMARK_URL_METADATA_QUEUE_NAME,
    timeoutSeconds
  )
  if (!reserved) {
    return null
  }

  return {
    task: reserved.payload,
    acknowledge: () => acknowledgeQueueMessage(reserved.receipt),
    release: () => releaseQueueMessage(reserved.receipt),
  }
}
