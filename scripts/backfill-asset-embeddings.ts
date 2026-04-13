import 'dotenv/config'

import { backfillMissingAssetEmbeddings } from '@/server/assets/assets.embedding.service'
import { pool } from '@/server/db/client'

async function main() {
  const limitArg = process.argv[2]
  const limit = limitArg ? Number(limitArg) : 50

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('Usage: pnpm assets:backfill-embeddings [positive integer limit]')
  }

  const result = await backfillMissingAssetEmbeddings(limit)
  console.info('[assets.embedding] Backfill result', result)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })