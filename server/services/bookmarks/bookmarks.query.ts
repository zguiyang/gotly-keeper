import 'server-only'

import { and, desc, eq } from 'drizzle-orm'

import { BOOKMARK_LIST_LIMIT_DEFAULT, BOOKMARK_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import { bookmarks } from './bookmarks.schema'
import type { BookmarkListItem } from './bookmarks.types'
import { toBookmarkListItem } from './bookmarks.mapper'

export { type BookmarkListItem }

type ListBookmarksOptions = {
  userId: string
  limit?: number
}

function clampBookmarkListLimit(limit = BOOKMARK_LIST_LIMIT_DEFAULT) {
  return Math.min(limit, BOOKMARK_LIST_LIMIT_MAX)
}

export async function listBookmarks({
  userId,
  limit = BOOKMARK_LIST_LIMIT_DEFAULT,
}: ListBookmarksOptions): Promise<BookmarkListItem[]> {
  const clampedLimit = clampBookmarkListLimit(limit)

  const rows = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt))
    .limit(clampedLimit)

  return rows.map(toBookmarkListItem)
}

export async function getBookmarkById(
  bookmarkId: string,
  userId: string
): Promise<BookmarkListItem | null> {
  const [row] = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)))
    .limit(1)

  return row ? toBookmarkListItem(row) : null
}
