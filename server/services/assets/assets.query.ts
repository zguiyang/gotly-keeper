import 'server-only'

import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import { assets } from '@/server/lib/db/schema'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { ASSET_LIST_LIMIT_MIN, ASSET_LIST_LIMIT_DEFAULT, ASSET_LIST_LIMIT_MAX, ASSET_RECENT_LIMIT_DEFAULT, ASSET_RECENT_LIMIT_MAX } from '@/server/lib/config/constants'
import { toAssetListItem } from './assets.mapper'

export { type AssetListItem }

type AssetType = 'note' | 'link' | 'todo'

type ListAssetsOptions = {
  userId: string
  type?: AssetType
  limit?: number
}

function clampAssetListLimit(limit = ASSET_LIST_LIMIT_DEFAULT) {
  return Math.min(Math.max(ASSET_LIST_LIMIT_MIN, limit), ASSET_LIST_LIMIT_MAX)
}

export async function listAssets({
  userId,
  type,
  limit = 50,
}: ListAssetsOptions): Promise<AssetListItem[]> {
  const conditions = type
    ? and(eq(assets.userId, userId), eq(assets.type, type))
    : eq(assets.userId, userId)

  const rows = await db
    .select()
    .from(assets)
    .where(conditions)
    .orderBy(desc(assets.createdAt))
    .limit(clampAssetListLimit(limit))

  return rows.map(toAssetListItem)
}

export function listLinkAssets(userId: string, limit = 50) {
  return listAssets({ userId, type: 'link', limit })
}

export function listTodoAssets(userId: string, limit = 50) {
  return listAssets({ userId, type: 'todo', limit })
}

export function listNoteAssets(userId: string, limit = 50) {
  return listAssets({ userId, type: 'note', limit })
}

export async function listIncompleteTodoAssets(
  userId: string,
  limit = 10
): Promise<AssetListItem[]> {
  const rows = await db
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.userId, userId),
        eq(assets.type, 'todo'),
        sql`${assets.completedAt} is null`
      )
    )
    .orderBy(sql`${assets.dueAt} asc nulls last`, desc(assets.createdAt))
    .limit(clampAssetListLimit(limit))

  return rows.map(toAssetListItem)
}

export async function listRecentAssets(userId: string, limit = ASSET_RECENT_LIMIT_DEFAULT): Promise<AssetListItem[]> {
  const clampedLimit = Math.min(Math.max(ASSET_LIST_LIMIT_MIN, limit), ASSET_RECENT_LIMIT_MAX)

  const rows = await db
    .select()
    .from(assets)
    .where(eq(assets.userId, userId))
    .orderBy(desc(assets.createdAt))
    .limit(clampedLimit)

  return rows.map(toAssetListItem)
}
