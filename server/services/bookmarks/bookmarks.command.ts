import 'server-only'

import { db } from '@/server/lib/db'
import { bookmarks } from './bookmarks.schema'
import type { BookmarkListItem } from './bookmarks.types'
import { toBookmarkListItem } from './bookmarks.mapper'

export async function createBookmark(input: {
  userId: string
  text: string
  url: string
}): Promise<BookmarkListItem> {
  const trimmed = input.text.trim()
  if (!trimmed) {
    throw new Error('EMPTY_INPUT')
  }

  if (!input.url) {
    throw new Error('URL_REQUIRED')
  }

  const [created] = await db
    .insert(bookmarks)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      originalText: trimmed,
      url: input.url,
    })
    .returning()

  return toBookmarkListItem(created)
}
