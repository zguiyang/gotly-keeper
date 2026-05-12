import 'server-only'

import { runUrlMetadataTask } from '@/server/lib/metadata/run-url-metadata-task'
import { writeBookmarkUrlMetadataResult } from '@/server/services/bookmark/bookmark-url-metadata.service'
import { dequeueBookmarkUrlMetadataTask } from '@/server/services/bookmark/bookmark-url-metadata-queue.service'

import { BaseWorker } from './base.worker'

import type { BookmarkUrlMetadataTask } from '@/server/services/bookmark/bookmark-url-metadata.contract'

type ReservedBookmarkUrlMetadataTask = {
  task: BookmarkUrlMetadataTask
  acknowledge: () => Promise<void>
  release: () => Promise<void>
}

export class UrlMetadataFetchQueueWorker extends BaseWorker<ReservedBookmarkUrlMetadataTask> {
  constructor() {
    super('url-metadata-fetch')
  }

  protected async dequeueTask(): Promise<ReservedBookmarkUrlMetadataTask | null> {
    return dequeueBookmarkUrlMetadataTask(5)
  }

  protected async handleTask(reservedTask: ReservedBookmarkUrlMetadataTask): Promise<void> {
    const result = await runUrlMetadataTask(reservedTask.task.metadataTask)
    await writeBookmarkUrlMetadataResult({
      userId: reservedTask.task.userId,
      bookmarkId: reservedTask.task.bookmarkId,
      result,
    })
    await reservedTask.acknowledge()
  }

  protected async onError(error: unknown, reservedTask: ReservedBookmarkUrlMetadataTask | null): Promise<void> {
    if (reservedTask) {
      await reservedTask.release()
    }

    await super.onError(error, reservedTask)
  }
}
