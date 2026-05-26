import 'server-only'

import { and, eq, inArray, lt, or, type SQL } from 'drizzle-orm'

import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'

/**
 * Shared utilities for asset-type query modules (notes, bookmarks, todos).
 *
 * These eliminate the identical `resolveLifecycleStatuses`, `buildDescendingCursorCondition`,
 * and `clamp*ListLimit` functions duplicated across three asset services.
 */

// ── Lifecycle status resolution ────────────────────────────────────────

export function resolveLifecycleStatuses(input: {
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

/**
 * Builds a lifecycle-filtering WHERE clause part.
 * Handles single-status equality vs multi-status IN-ARRAY.
 */
export function buildLifecycleFilter(
  lifecycleStatuses: AssetLifecycleStatus[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle ORM column type; any needed for generic access
  lifecycleColumn: { lifecycleStatus: any }
): SQL | undefined {
  if (lifecycleStatuses.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return eq(lifecycleColumn.lifecycleStatus as any, lifecycleStatuses[0]) as SQL
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return inArray(lifecycleColumn.lifecycleStatus as any, lifecycleStatuses) as SQL
}

export type CursorPayload = {
  createdAt: string
  id: string
}

/**
 * Builds the descending cursor condition for cursor-based pagination.
 * Expects the cursor payload from `decodeCursor` and the table's column
 * references for `createdAt` and `id`.
 *
 * Returns `null` when there is no cursor (first page).
 */
export function buildDescendingCursorCondition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle ORM column reference; any needed for generic access to createdAt/id columns
  createdAtColumn: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  idColumn: any,
  cursor: CursorPayload | null
): SQL | null {
  if (!cursor) {
    return null
  }

  const cursorCreatedAt = new Date(cursor.createdAt)
  if (Number.isNaN(cursorCreatedAt.getTime())) {
    throw new Error('INVALID_CURSOR')
  }

  return or(
    lt(createdAtColumn, cursorCreatedAt),
    and(eq(createdAtColumn, cursorCreatedAt), lt(idColumn, cursor.id))
  ) as SQL
}

// ── Limit clamping ─────────────────────────────────────────────────────

export function clampListLimit(limit: number, maxLimit: number): number {
  return Math.min(Math.max(1, limit), maxLimit)
}
