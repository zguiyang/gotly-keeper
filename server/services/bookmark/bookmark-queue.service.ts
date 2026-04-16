import 'server-only'

import { dequeueQueueMessage, enqueueQueueMessage } from '@/server/services/queue/queue.service'

import type { BookmarkEnrichTask } from './bookmark-enrich.contract'

const BOOKMARK_ENRICH_QUEUE_NAME = 'bookmark:enrich'

export async function enqueueBookmarkEnrichTask(task: BookmarkEnrichTask): Promise<void> {
  await enqueueQueueMessage(BOOKMARK_ENRICH_QUEUE_NAME, task)
}

export async function dequeueBookmarkEnrichTask(
  timeoutSeconds = 5
): Promise<BookmarkEnrichTask | null> {
  return dequeueQueueMessage<BookmarkEnrichTask>(BOOKMARK_ENRICH_QUEUE_NAME, timeoutSeconds)
}

