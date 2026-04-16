import 'server-only'

import { and, desc, eq, sql } from 'drizzle-orm'

import { ASSET_LIST_LIMIT_MIN, ASSET_LIST_LIMIT_DEFAULT, ASSET_LIST_LIMIT_MAX, ASSET_RECENT_LIMIT_DEFAULT, ASSET_RECENT_LIMIT_MAX } from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import { assets } from '@/server/lib/db/schema'
import { type AssetListItem } from '@/shared/assets/assets.types'

import { toAssetListItem } from './assets.mapper'

export { type AssetListItem }

type AssetType = 'note' | 'link' | 'todo'

type ListAssetsOptions = {
  userId: string
  type?: AssetType
  limit?: number
}

const ASSET_LEGACY_SELECT_COLUMNS = {
  id: assets.id,
  userId: assets.userId,
  originalText: assets.originalText,
  type: assets.type,
  url: assets.url,
  timeText: assets.timeText,
  dueAt: assets.dueAt,
  completedAt: assets.completedAt,
  createdAt: assets.createdAt,
  updatedAt: assets.updatedAt,
}

function isMissingBookmarkMetaColumnError(error: unknown) {
  const errorWithCause = error as { cause?: { code?: string; message?: string } } | null
  return (
    errorWithCause?.cause?.code === '42703' &&
    errorWithCause?.cause?.message?.includes('bookmark_meta') === true
  )
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

  const clampedLimit = clampAssetListLimit(limit)
  let rows: Parameters<typeof toAssetListItem>[0][]
  try {
    rows = await db
      .select()
      .from(assets)
      .where(conditions)
      .orderBy(desc(assets.createdAt))
      .limit(clampedLimit)
  } catch (error) {
    if (!isMissingBookmarkMetaColumnError(error)) {
      throw error
    }
    rows = await db
      .select(ASSET_LEGACY_SELECT_COLUMNS)
      .from(assets)
      .where(conditions)
      .orderBy(desc(assets.createdAt))
      .limit(clampedLimit)
  }

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
  const conditions = and(
    eq(assets.userId, userId),
    eq(assets.type, 'todo'),
    sql`${assets.completedAt} is null`
  )
  const clampedLimit = clampAssetListLimit(limit)
  let rows: Parameters<typeof toAssetListItem>[0][]
  try {
    rows = await db
      .select()
      .from(assets)
      .where(conditions)
      .orderBy(sql`${assets.dueAt} asc nulls last`, desc(assets.createdAt))
      .limit(clampedLimit)
  } catch (error) {
    if (!isMissingBookmarkMetaColumnError(error)) {
      throw error
    }
    rows = await db
      .select(ASSET_LEGACY_SELECT_COLUMNS)
      .from(assets)
      .where(conditions)
      .orderBy(sql`${assets.dueAt} asc nulls last`, desc(assets.createdAt))
      .limit(clampedLimit)
  }

  return rows.map(toAssetListItem)
}

export async function listRecentAssets(userId: string, limit = ASSET_RECENT_LIMIT_DEFAULT): Promise<AssetListItem[]> {
  const clampedLimit = Math.min(Math.max(ASSET_LIST_LIMIT_MIN, limit), ASSET_RECENT_LIMIT_MAX)

  let rows: Parameters<typeof toAssetListItem>[0][]
  try {
    rows = await db
      .select()
      .from(assets)
      .where(eq(assets.userId, userId))
      .orderBy(desc(assets.createdAt))
      .limit(clampedLimit)
  } catch (error) {
    if (!isMissingBookmarkMetaColumnError(error)) {
      throw error
    }
    rows = await db
      .select(ASSET_LEGACY_SELECT_COLUMNS)
      .from(assets)
      .where(eq(assets.userId, userId))
      .orderBy(desc(assets.createdAt))
      .limit(clampedLimit)
  }

  return rows.map(toAssetListItem)
}
