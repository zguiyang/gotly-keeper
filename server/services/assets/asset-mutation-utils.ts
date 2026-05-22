import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'
import { now } from '@/shared/time/dayjs'

/**
 * Shared lifecycle-mutation helpers for asset-type services (notes, bookmarks, todos).
 *
 * Eliminates the identical `updateLifecycle` + 5 lifecycle CRUD wrappers
 * (archive / unarchive / moveToTrash / restoreFromTrash / purge) duplicated
 * across three asset-service mutation files.
 */

type LifecycleInput = {
  assetId: string
  userId: string
  fromStatuses: AssetLifecycleStatus[]
  toStatus: AssetLifecycleStatus
  archivedAt: Date | null
  trashedAt: Date | null
}

/**
 * Generic lifecycle-status transition.
 *
 * `adapter.table` — the Drizzle table object that has `id`, `userId`,
 *   `lifecycleStatus`, `archivedAt`, `trashedAt`, `updatedAt` columns.
 * `adapter.toListItem` — mapper from a raw DB row to the typed list-item.
 */
export async function updateAssetLifecycle<T>(
  input: LifecycleInput,
  adapter: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle ORM table shape is complex; any is the most practical type for generic access to shared lifecycle columns
    table: { id: any; userId: any; lifecycleStatus: any }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mapper input is a raw DB row whose type depends on the caller's table
    toListItem: (row: any) => T
  }
): Promise<T | null> {
  for (const fromStatus of input.fromStatuses) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- db is typed via Drizzle's complex builder chain; any is needed for generic table access
    const [updated] = await (db as any)
      .update(adapter.table)
      .set({
        lifecycleStatus: input.toStatus,
        archivedAt: input.archivedAt,
        trashedAt: input.trashedAt,
        updatedAt: now(),
      })
      .where(
        and(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eq(adapter.table.id as any, input.assetId),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eq(adapter.table.userId as any, input.userId),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eq(adapter.table.lifecycleStatus as any, fromStatus)
        )
      )
      .returning()

    if (updated) {
      return adapter.toListItem(updated)
    }
  }

  return null
}

/**
 * Generic permanent-delete helper for trashed assets.
 */
export async function purgeAsset(
  assetId: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle ORM table shape; any needed for generic access
  table: { id: any; userId: any; lifecycleStatus: any }
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleted = await (db as any)
    .delete(table)
    .where(
      and(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eq(table.id as any, assetId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eq(table.userId as any, userId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eq(table.lifecycleStatus as any, ASSET_LIFECYCLE_STATUS.TRASHED)
      )
    )
    .returning({ id: table.id })

  return deleted.length > 0
}
