import 'server-only'

import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import type { BookmarkMeta } from '@/shared/assets/bookmark-meta.types'

export const bookmarks = pgTable('bookmarks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  originalText: text('original_text').notNull(),
  url: text('url').notNull(),
  bookmarkMeta: jsonb('bookmark_meta').$type<BookmarkMeta>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Bookmark = typeof bookmarks.$inferSelect
export type NewBookmark = typeof bookmarks.$inferInsert
