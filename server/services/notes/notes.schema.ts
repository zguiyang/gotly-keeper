import 'server-only'

import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  originalText: text('original_text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert
