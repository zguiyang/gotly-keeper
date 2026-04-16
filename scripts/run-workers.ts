import 'dotenv/config'

import { BookmarkEnrichWorker } from '@/server/workers/bookmark-enrich.worker'

async function main() {
  const workers = [new BookmarkEnrichWorker()]

  console.info(`[workers] starting ${workers.length} worker(s): ${workers.map((worker) => worker.name).join(', ')}`)

  await Promise.all(
    workers.map(async (worker) => {
      console.info(`[workers] ${worker.name} started`)
      await worker.start()
    })
  )
}

void main().catch((error) => {
  console.error('[workers] failed to start workers', error)
  process.exit(1)
})
