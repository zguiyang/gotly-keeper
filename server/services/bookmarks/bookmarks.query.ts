import 'server-only'

import { and, desc, eq, inArray } from 'drizzle-orm'

import { BOOKMARK_LIST_LIMIT_DEFAULT, BOOKMARK_LIST_LIMIT_MAX } from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'

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

type GetBookmarkByIdOptions = {
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}

function resolveLifecycleStatuses(input: {
  lifecycleStatus?: AssetLifecycleStatus
  includeLifecycleStatuses?: AssetLifecycleStatus[]
}): AssetLifecycleStatus[] {
  if (input.includeLifecycleStatuses?.length) {
    return input.includeLifecycleStatuses
  }

  if (input.lifecycleStatus) {
    return [input.lifecycleStatus]
  }

  return [ASSET_LIFECYCLE_STATUS.ACTIVE]
}

function clampBookmarkListLimit(limit = BOOKMARK_LIST_LIMIT_DEFAULT) {
  return Math.min(limit, BOOKMARK_LIST_LIMIT_MAX)
}

export async function listBookmarks({
  userId,
  limit = BOOKMARK_LIST_LIMIT_DEFAULT,
  lifecycleStatus,
  includeLifecycleStatuses,
}: ListBookmarksOptions): Promise<BookmarkListItem[]> {
  const clampedLimit = clampBookmarkListLimit(limit)
  const lifecycleStatuses = resolveLifecycleStatuses({ lifecycleStatus, includeLifecycleStatuses })

  const conditions = and(
    eq(bookmarks.userId, userId),
    lifecycleStatuses.length === 1
      ? eq(bookmarks.lifecycleStatus, lifecycleStatuses[0])
      : inArray(bookmarks.lifecycleStatus, lifecycleStatuses)
  )

  const rows = await db
    .select()
    .from(bookmarks)
    .where(conditions)
    .orderBy(desc(bookmarks.createdAt))
    .limit(clampedLimit)

  return rows.map(toBookmarkListItem)
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
        lifecycleStatuses.length === 1
          ? eq(bookmarks.lifecycleStatus, lifecycleStatuses[0])
          : inArray(bookmarks.lifecycleStatus, lifecycleStatuses)
      )
    )
    .limit(1)

  return row ? toBookmarkListItem(row) : null
}
