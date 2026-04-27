import 'server-only'

import { db } from '@/server/lib/db'
import { createAssetRecord } from '@/server/services/assets/create-asset-record'

import { toBookmarkListItem } from './bookmarks.mapper'
import { bookmarks } from './bookmarks.schema'

import type { BookmarkListItem } from './bookmarks.types'

function normalizeOptionalText(value?: string | null): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function resolveRawInput(input: { rawInput?: string; text?: string }): string {
  return input.rawInput ?? input.text ?? ''
}

function normalizeUrlOrThrow(url: string): string {
  const normalized = url.trim()
  if (!normalized) {
    throw new Error('URL_REQUIRED')
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(normalized)
  } catch {
    throw new Error('INVALID_URL')
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('UNSUPPORTED_PROTOCOL')
  }

  return normalized
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
  const normalizedTitle = normalizeOptionalText(input.title)
  const normalizedNote = normalizeOptionalText(input.note)
  const normalizedSummary = normalizeOptionalText(input.summary)

  return createAssetRecord({
    text: resolveRawInput(input),
    validate: () => {
      void normalizeUrlOrThrow(input.url)
    },
    insert: async (trimmedText) => {
      const normalizedUrl = normalizeUrlOrThrow(input.url)

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
