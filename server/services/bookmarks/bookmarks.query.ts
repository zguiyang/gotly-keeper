import 'server-only'

import { and, desc, eq } from 'drizzle-orm'

import { BOOKMARK_LIST_LIMIT_DEFAULT, BOOKMARK_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import {
  buildDescendingCursorCondition,
  buildLifecycleFilter,
  clampListLimit,
  resolveLifecycleStatuses,
  type CursorPayload,
} from '@/server/services/assets/asset-query-utils'
import { createCursorPage, clampPageSize, decodeCursor } from '@/server/services/pagination'
import { ASSET_LIFECYCLE_STATUS, type AssetLifecycleStatus } from '@/shared/assets/asset-lifecycle.types'

import { toBookmarkListItem } from './bookmarks.mapper'
import { bookmarks } from './bookmarks.schema'

import type { BookmarkListItem } from './bookmarks.types'

export { type BookmarkListItem }

type ListBookmarksOptions = {
  userId: string
  limit?: number
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type ListBookmarksPageOptions = {
  userId: string
  pageSize?: number
  cursor?: string | null
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

type GetBookmarkByIdOptions = {
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

export async function listBookmarks({
  userId,
  limit = BOOKMARK_LIST_LIMIT_DEFAULT,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListBookmarksOptions): Promise<BookmarkListItem[]> {
  const clampedLimit = clampListLimit(limit, BOOKMARK_LIST_LIMIT_MAX)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })

  const conditions = and(
    eq(bookmarks.userId, userId),
    buildLifecycleFilter(lifecycleStatuses, bookmarks) ?? undefined
  )

  const rows = await db
    .select()
    .from(bookmarks)
    .where(conditions)
    .orderBy(desc(bookmarks.createdAt))
    .limit(clampedLimit)

  return rows.map(toBookmarkListItem)
}

export async function listBookmarksPage({
  userId,
  pageSize = BOOKMARK_LIST_LIMIT_DEFAULT,
  cursor,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListBookmarksPageOptions): Promise<{
  items: BookmarkListItem[]
  pageInfo: {
    pageSize: number
    nextCursor: string | null
    hasNextPage: boolean
  }
}> {
  const clampedPageSize = clampPageSize(pageSize, 1, BOOKMARK_LIST_LIMIT_MAX)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })
  const cursorPayload = decodeCursor<CursorPayload>(cursor)

  const conditions = and(
    eq(bookmarks.userId, userId),
    buildLifecycleFilter(lifecycleStatuses, bookmarks) ?? undefined,
    buildDescendingCursorCondition(bookmarks.createdAt, bookmarks.id, cursorPayload) ?? undefined
  )

  const rows = await db
    .select()
    .from(bookmarks)
    .where(conditions)
    .orderBy(desc(bookmarks.createdAt), desc(bookmarks.id))
    .limit(clampedPageSize + 1)

  return createCursorPage({
    rows: rows.map(toBookmarkListItem),
    pageSize: clampedPageSize,
    getCursorPayload: (item) => ({
      createdAt: item.createdAt.toISOString(),
      id: item.id,
    }),
  })
}

export async function getBookmarkById(
  bookmarkId: string,
  userId: string,
  options?: GetBookmarkByIdOptions
): Promise<BookmarkListItem | null> {
  const lifecycleStatuses = resolveLifecycleStatuses({
    includeLifecycleStatuses: options?.includeLifecycleStatuses,
  })

  const [row] = await db
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.id, bookmarkId),
        eq(bookmarks.userId, userId),
        buildLifecycleFilter(lifecycleStatuses, bookmarks) ?? undefined
      )
    )
    .limit(1)

  return row ? toBookmarkListItem(row) : null
}

export async function findDuplicateBookmarks(input: {
  userId: string
  url: string
}): Promise<BookmarkListItem[]> {
  const url = input.url.trim()
  if (!url) {
    return []
  }

  const rows = await db
    .select()
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, input.userId),
        eq(bookmarks.lifecycleStatus, ASSET_LIFECYCLE_STATUS.ACTIVE),
        eq(bookmarks.url, url)
      )
    )
    .orderBy(desc(bookmarks.createdAt))
    .limit(BOOKMARK_LIST_LIMIT_DEFAULT)

  return rows.map(toBookmarkListItem)
}
