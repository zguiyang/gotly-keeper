import 'server-only'

import chalk from 'chalk'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

import { serverEnv } from '@/server/lib/env'
import * as schema from './schema'

const globalForPool = globalThis as unknown as {
  pool: Pool | undefined
}

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

export async function checkDatabaseConnection() {
  await pool.query('select 1')
  console.info(chalk.green('[db] Postgres connected'))
}
