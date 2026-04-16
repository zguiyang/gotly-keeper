import 'server-only'

import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const todos = pgTable('todos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  originalText: text('original_text').notNull(),
  timeText: text('time_text'),
  dueAt: timestamp('due_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
