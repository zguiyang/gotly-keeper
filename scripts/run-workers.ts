import { selectWorkerRunners } from '@/server/workers/worker-registry'

async function main() {
  const selectedRunners = selectWorkerRunners(process.env.WORKERS)

  if (selectedRunners.length === 0) {
    console.error(
      '[workers] no worker selected. set WORKERS=bookmark-enrich or leave it empty to run all.'
    )
    process.exit(1)
  }

  console.info(
    `[workers] starting ${selectedRunners.length} worker(s): ${selectedRunners.map((runner) => runner.name).join(', ')}`
  )

  await Promise.all(
    selectedRunners.map(async (runner) => {
      console.info(`[workers] ${runner.name} started`)
      await runner.start()
    })
  )
}

void main().catch((error) => {
  console.error('[workers] failed to start workers', error)
  process.exit(1)
})

