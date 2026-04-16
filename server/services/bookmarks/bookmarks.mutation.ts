import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import { now } from '@/shared/time/dayjs'
import type { BookmarkMeta } from '@/shared/assets/bookmark-meta.types'
import { bookmarks } from './bookmarks.schema'
import type { BookmarkListItem } from './bookmarks.types'
import { toBookmarkListItem } from './bookmarks.mapper'

type UpdateBookmarkEnrichmentInput = {
  userId: string
  bookmarkId: string
  bookmarkMeta: BookmarkMeta
}

export async function updateBookmarkEnrichment({
  userId,
  bookmarkId,
  bookmarkMeta,
}: UpdateBookmarkEnrichmentInput): Promise<BookmarkListItem | null> {
  const [updated] = await db
    .update(bookmarks)
    .set({
      bookmarkMeta,
      updatedAt: now(),
    })
    .where(
      and(
        eq(bookmarks.id, bookmarkId),
        eq(bookmarks.userId, userId)
      )
    )
    .returning()

  return updated ? toBookmarkListItem(updated) : null
}
