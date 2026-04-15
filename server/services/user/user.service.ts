import 'server-only'

import { eq } from 'drizzle-orm'

import { db, users } from '@/server/lib/db'
import type { User } from '@/server/lib/db/schema'

export async function getUserById(id: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return result[0] ?? null
}
