import 'server-only'

import { db } from '@/server/lib/db'
import { createAssetRecord } from '@/server/services/assets/create-asset-record'
import { bookmarks } from './bookmarks.schema'
import type { BookmarkListItem } from './bookmarks.types'
import { toBookmarkListItem } from './bookmarks.mapper'

function normalizeOptionalText(value?: string | null): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function resolveRawInput(input: { rawInput?: string; text?: string }): string {
  return input.rawInput ?? input.text ?? ''
}

export async function createBookmark(input: {
  userId: string
  rawInput?: string
  text?: string
  url: string
  title?: string | null
  note?: string | null
  summary?: string | null
}): Promise<BookmarkListItem> {
  const normalizedUrl = input.url.trim()
  const normalizedTitle = normalizeOptionalText(input.title)
  const normalizedNote = normalizeOptionalText(input.note)
  const normalizedSummary = normalizeOptionalText(input.summary)

  return createAssetRecord({
    text: resolveRawInput(input),
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
          title: normalizedTitle,
          note: normalizedNote,
          summary: normalizedSummary,
          url: normalizedUrl,
        })
        .returning()

      return created
    },
    map: toBookmarkListItem,
  })
}
