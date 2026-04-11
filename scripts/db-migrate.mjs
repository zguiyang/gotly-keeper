import 'dotenv/config'

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required')
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 1,
})

try {
  await migrate(drizzle(pool), { migrationsFolder: 'drizzle' })
  console.info('Database migrations applied')
} finally {
  await pool.end()
}
