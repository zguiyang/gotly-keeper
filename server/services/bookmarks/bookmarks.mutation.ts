import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'
import { BOOKMARK_META_STATUS, type BookmarkMeta } from '@/shared/assets/bookmark-meta.types'
import { now , nowIso } from '@/shared/time/dayjs'

import { toBookmarkListItem } from './bookmarks.mapper'
import { bookmarks } from './bookmarks.schema'

import type { BookmarkListItem } from './bookmarks.types'


type UpdateBookmarkEnrichmentInput = {
  userId: string
  bookmarkId: string
  bookmarkMeta: BookmarkMeta
}

type UpdateBookmarkResult = {
  item: BookmarkListItem
  urlChanged: boolean
}

function normalizeTextOrThrow(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('EMPTY_INPUT')
  }

  return trimmed
}

function normalizeUrlOrThrow(url: string): string {
  const normalized = url.trim()
  if (!normalized) {
    throw new Error('URL_REQUIRED')
  }

  return normalized
}

function createPendingBookmarkMeta(): BookmarkMeta {
  return {
    status: BOOKMARK_META_STATUS.PENDING,
    title: null,
    icon: null,
    bookmarkType: null,
    description: null,
    contentSummary: null,
    errorCode: null,
    errorMessage: null,
    updatedAt: nowIso(),
  }
}

async function updateLifecycle(input: {
  userId: string
  bookmarkId: string
  fromStatuses: AssetLifecycleStatus[]
  toStatus: AssetLifecycleStatus
  archivedAt: Date | null
  trashedAt: Date | null
}): Promise<BookmarkListItem | null> {
  for (const fromStatus of input.fromStatuses) {
    const [updated] = await db
      .update(bookmarks)
      .set({
        lifecycleStatus: input.toStatus,
        archivedAt: input.archivedAt,
        trashedAt: input.trashedAt,
        updatedAt: now(),
      })
      .where(
        and(
          eq(bookmarks.id, input.bookmarkId),
          eq(bookmarks.userId, input.userId),
          eq(bookmarks.lifecycleStatus, fromStatus)
        )
      )
      .returning()

    if (updated) {
      return toBookmarkListItem(updated)
    }
  }

  return null
}

export async function updateBookmark(input: {
  userId: string
  bookmarkId: string
  text: string
  url: string
}): Promise<UpdateBookmarkResult | null> {
  const trimmedText = normalizeTextOrThrow(input.text)
  const normalizedUrl = normalizeUrlOrThrow(input.url)

  const [existing] = await db
    .select({
      url: bookmarks.url,
    })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.id, input.bookmarkId),
        eq(bookmarks.userId, input.userId),
        eq(bookmarks.lifecycleStatus, ASSET_LIFECYCLE_STATUS.ACTIVE)
      )
    )
    .limit(1)

  if (!existing) {
    return null
  }

  const urlChanged = (existing.url ?? '') !== normalizedUrl

  const [updated] = await db
    .update(bookmarks)
    .set({
      originalText: trimmedText,
      url: normalizedUrl,
      bookmarkMeta: urlChanged ? createPendingBookmarkMeta() : undefined,
      updatedAt: now(),
    })
    .where(
      and(
        eq(bookmarks.id, input.bookmarkId),
        eq(bookmarks.userId, input.userId),
        eq(bookmarks.lifecycleStatus, ASSET_LIFECYCLE_STATUS.ACTIVE)
      )
    )
    .returning()

  if (!updated) {
    return null
  }

  return {
    item: toBookmarkListItem(updated),
    urlChanged,
  }
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

export async function archiveBookmark(input: {
  userId: string
  bookmarkId: string
}): Promise<BookmarkListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    bookmarkId: input.bookmarkId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.ACTIVE],
    toStatus: ASSET_LIFECYCLE_STATUS.ARCHIVED,
    archivedAt: now(),
    trashedAt: null,
  })
}

export async function unarchiveBookmark(input: {
  userId: string
  bookmarkId: string
}): Promise<BookmarkListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    bookmarkId: input.bookmarkId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.ARCHIVED],
    toStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: null,
    trashedAt: null,
  })
}

export async function moveBookmarkToTrash(input: {
  userId: string
  bookmarkId: string
}): Promise<BookmarkListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    bookmarkId: input.bookmarkId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.ACTIVE, ASSET_LIFECYCLE_STATUS.ARCHIVED],
    toStatus: ASSET_LIFECYCLE_STATUS.TRASHED,
    archivedAt: null,
    trashedAt: now(),
  })
}

export async function restoreBookmarkFromTrash(input: {
  userId: string
  bookmarkId: string
}): Promise<BookmarkListItem | null> {
  return updateLifecycle({
    userId: input.userId,
    bookmarkId: input.bookmarkId,
    fromStatuses: [ASSET_LIFECYCLE_STATUS.TRASHED],
    toStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: null,
    trashedAt: null,
  })
}

export async function purgeBookmark(input: {
  userId: string
  bookmarkId: string
}): Promise<boolean> {
  const deleted = await db
    .delete(bookmarks)
    .where(
      and(
        eq(bookmarks.id, input.bookmarkId),
        eq(bookmarks.userId, input.userId),
        eq(bookmarks.lifecycleStatus, ASSET_LIFECYCLE_STATUS.TRASHED)
      )
    )
    .returning({ id: bookmarks.id })

  return deleted.length > 0
}
