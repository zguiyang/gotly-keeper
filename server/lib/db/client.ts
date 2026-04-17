import 'server-only'

import chalk from 'chalk'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { serverEnv } from '@/server/lib/env'

import * as schema from './schema'

const globalForPool = globalThis as unknown as {
  pool: Pool | undefined
}

const REQUIRED_LIFECYCLE_COLUMNS = [
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

function createPool() {
  const pool = new Pool(serverEnv.database)

  console.info(chalk.green('[db] Postgres pool initialized'))

  return pool
}

export const pool = globalForPool.pool ?? createPool()

if (process.env.NODE_ENV !== 'production') {
  globalForPool.pool = pool
}

export const db = drizzle(pool, { schema })

async function verifyWorkspaceLifecycleColumns() {
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
  const missing = REQUIRED_LIFECYCLE_COLUMNS.filter(
    (item) => !existing.has(`${item.table}.${item.column}`)
  )

  if (missing.length === 0) {
    return
  }

  const missingList = missing.map((item) => `${item.table}.${item.column}`).join(', ')
  throw new Error(
    `[db] Missing lifecycle columns: ${missingList}. Run "pnpm db:migrate" then restart dev server.`
  )
}

export async function checkDatabaseConnection() {
  await pool.query('select 1')
  await verifyWorkspaceLifecycleColumns()
  console.info(chalk.green('[db] Postgres connected'))
}
