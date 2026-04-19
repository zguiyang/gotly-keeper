import 'dotenv/config'

import { pool } from '@/server/lib/db/client'
import { backfillStructuredAssetFields } from '@/server/services/assets/asset-structured-backfill'

const REQUIRED_COLUMNS = [
  { table: 'notes', column: 'title' },
  { table: 'notes', column: 'content' },
  { table: 'notes', column: 'summary' },
  { table: 'todos', column: 'title' },
  { table: 'todos', column: 'content' },
  { table: 'bookmarks', column: 'title' },
  { table: 'bookmarks', column: 'note' },
  { table: 'bookmarks', column: 'summary' },
] as const

const USAGE_ERROR =
  'Usage: pnpm assets:backfill-structured [--dry-run] [--limit=<positive integer>]'

function parseArgs(argv: string[]) {
  let limitPerType = 100
  let dryRun = false

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }

    if (arg.startsWith('--limit=')) {
      limitPerType = Number(arg.slice('--limit='.length))
      continue
    }

    if (/^\d+$/.test(arg)) {
      limitPerType = Number(arg)
      continue
    }

    throw new Error(`${USAGE_ERROR}\nUnknown argument: ${arg}`)
  }

  if (!Number.isInteger(limitPerType) || limitPerType <= 0) {
    throw new Error(USAGE_ERROR)
  }

  return { limitPerType, dryRun }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  const { rows } = await pool.query<{
    table_name: string
    column_name: string
  }>(
    `
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and (
          (table_name = 'notes' and column_name in ('title', 'content', 'summary'))
          or (table_name = 'todos' and column_name in ('title', 'content'))
          or (table_name = 'bookmarks' and column_name in ('title', 'note', 'summary'))
        )
    `
  )

  const existing = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`))
  const missing = REQUIRED_COLUMNS.filter((item) => !existing.has(`${item.table}.${item.column}`))

  if (missing.length > 0) {
    throw new Error(
      `[assets.structured-backfill] Missing structured columns: ${missing
        .map((item) => `${item.table}.${item.column}`)
        .join(', ')}. Run "pnpm db:migrate" and retry.`
    )
  }

  const result = await backfillStructuredAssetFields(options)
  console.info('[assets.structured-backfill] result', result)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
