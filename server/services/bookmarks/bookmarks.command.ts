import 'server-only'

import { db } from '@/server/lib/db'
import { createAssetRecord } from '@/server/services/assets/create-asset-record'
import { bookmarks } from './bookmarks.schema'
import type { BookmarkListItem } from './bookmarks.types'
import { toBookmarkListItem } from './bookmarks.mapper'

export async function createBookmark(input: {
  userId: string
  text: string
  url: string
}): Promise<BookmarkListItem> {
  const normalizedUrl = input.url.trim()

  return createAssetRecord({
    text: input.text,
    validate: () => {
      if (!normalizedUrl) {
        throw new Error('URL_REQUIRED')
      }
    },
    insert: async (trimmedText) => {
      const [created] = await db
        .insert(bookmarks)
        .values({
          id: crypto.randomUUID(),
          userId: input.userId,
          originalText: trimmedText,
          url: normalizedUrl,
        })
        .returning()

      return created
    },
    map: toBookmarkListItem,
  })
}
