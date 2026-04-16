import 'server-only'

import { writeBookmarkEnrichResult } from '@/server/modules/workspace/bookmark-enrich.module'
import { dequeueBookmarkEnrichTask } from '@/server/services/bookmark/bookmark-queue.service'

import { runBookmarkEnrichWorker } from './bookmark-enrich.worker'

export async function runBookmarkEnrichRunner(): Promise<never> {
  for (;;) {
    const task = await dequeueBookmarkEnrichTask(5)
    if (!task) {
      continue
    }

    const result = await runBookmarkEnrichWorker(task)
    await writeBookmarkEnrichResult({
      userId: task.userId,
      bookmarkId: task.bookmarkId,
      result,
    })
  }
}

