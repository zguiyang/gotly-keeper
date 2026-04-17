import 'dotenv/config'

import { Pool } from 'pg'

const REQUIRED_COLUMNS = [
  { table: 'notes', column: 'lifecycle_status' },
  { table: 'notes', column: 'archived_at' },
  { table: 'notes', column: 'trashed_at' },
  { table: 'todos', column: 'lifecycle_status' },
  { table: 'todos', column: 'archived_at' },
  { table: 'todos', column: 'trashed_at' },
  { table: 'bookmarks', column: 'lifecycle_status' },
  { table: 'bookmarks', column: 'archived_at' },
  { table: 'bookmarks', column: 'trashed_at' },
] as const

function getDatabaseConfig() {
  return {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    ssl: false,
  }
}

async function verifyWorkspaceLifecycleColumns() {
  const pool = new Pool(getDatabaseConfig())

  try {
    const { rows } = await pool.query<{
      table_name: string
      column_name: string
    }>(
      `
        select table_name, column_name
        from information_schema.columns
        where table_schema = 'public'
          and (
            (table_name = 'notes' and column_name in ('lifecycle_status', 'archived_at', 'trashed_at'))
            or (table_name = 'todos' and column_name in ('lifecycle_status', 'archived_at', 'trashed_at'))
            or (table_name = 'bookmarks' and column_name in ('lifecycle_status', 'archived_at', 'trashed_at'))
          )
      `
    )

    const existing = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`))
    const missing = REQUIRED_COLUMNS.filter(
      (item) => !existing.has(`${item.table}.${item.column}`)
    )

    if (missing.length > 0) {
      const missingList = missing.map((item) => `${item.table}.${item.column}`).join(', ')
      throw new Error(
        `[verify:db] Missing lifecycle columns: ${missingList}. Run "pnpm db:migrate" and retry.`
      )
    }

    console.info('[verify:db] OK - workspace lifecycle columns exist')
  } finally {
    await pool.end()
  }
}

verifyWorkspaceLifecycleColumns().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
