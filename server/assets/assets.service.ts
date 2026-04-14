import 'server-only'

import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/server/db'
import { assets, type Asset } from '@/server/db/schema'
import { interpretAssetInput } from './assets.interpreter'
import { scheduleAssetEmbeddingBestEffort } from './assets.embedding-scheduler'
import { searchAssets as performAssetSearch } from '@/server/search/assets-search.service'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { type AssetSummaryTarget } from './assets.summary-intent.pure'
import { ASSET_LIST_LIMIT_MIN, ASSET_LIST_LIMIT_DEFAULT, ASSET_LIST_LIMIT_MAX, ASSET_RECENT_LIMIT_DEFAULT, ASSET_RECENT_LIMIT_MAX } from '@/server/config/constants'

export { type AssetListItem }

export type AssetSummaryCommand = {
  kind: 'summary'
  summaryTarget: AssetSummaryTarget
  query: string
}

type AssetType = Asset['type']

type SetTodoCompletionInput = {
  userId: string
  assetId: string
  completed: boolean
}

type ListAssetsOptions = {
  userId: string
  type?: AssetType
  limit?: number
}

function clampAssetListLimit(limit = ASSET_LIST_LIMIT_DEFAULT) {
  return Math.min(Math.max(ASSET_LIST_LIMIT_MIN, limit), ASSET_LIST_LIMIT_MAX)
}

type SearchAssetsOptions = {
  userId: string
  query: string
  typeHint?: AssetType | null
  timeHint?: string | null
  completionHint?: 'complete' | 'incomplete' | null
  limit?: number
}

type AssetSearchCommand = {
  kind: 'search'
  query: string
  typeHint: AssetType | null
  timeHint: string | null
  completionHint: 'complete' | 'incomplete' | null
}

export async function searchAssets(
  options: SearchAssetsOptions
): Promise<AssetListItem[]> {
  return performAssetSearch(options)
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

export function toAssetListItem(asset: Asset): AssetListItem {
  return {
    id: asset.id,
    originalText: asset.originalText,
    title: asset.originalText.slice(0, 32),
    excerpt: asset.originalText,
    type: asset.type,
    url: asset.url,
    timeText: asset.timeText,
    dueAt: asset.dueAt,
    completed: asset.completedAt !== null,
    createdAt: asset.createdAt,
  }
}

export async function createAsset(input: {
  userId: string
  text: string
}): Promise<{ kind: 'created'; asset: AssetListItem } | AssetSearchCommand | AssetSummaryCommand> {
  const trimmed = input.text.trim()
  if (!trimmed) {
    throw new Error('EMPTY_INPUT')
  }

  const command = await interpretAssetInput(trimmed)

  if (command.intent === 'summarize_assets') {
    return {
      kind: 'summary',
      summaryTarget: command.summaryTarget,
      query: command.query,
    }
  }

  if (command.intent === 'search_assets') {
    return {
      kind: 'search',
      query: command.query,
      typeHint: command.typeHint,
      timeHint: command.timeHint,
      completionHint: command.completionHint,
    }
  }

  if (command.intent === 'create_link') {
    const [created] = await db
      .insert(assets)
      .values({
        id: crypto.randomUUID(),
        userId: input.userId,
        originalText: trimmed,
        type: 'link',
        url: command.url,
        timeText: command.timeText,
        dueAt: command.dueAt,
      })
        .returning()

    scheduleAssetEmbeddingBestEffort(created)

    return { kind: 'created', asset: toAssetListItem(created) }
  }

  if (command.intent === 'create_todo') {
    const [created] = await db
      .insert(assets)
      .values({
        id: crypto.randomUUID(),
        userId: input.userId,
        originalText: trimmed,
        type: 'todo',
        url: command.url,
        timeText: command.timeText,
        dueAt: command.dueAt,
      })
        .returning()

    scheduleAssetEmbeddingBestEffort(created)

    return { kind: 'created', asset: toAssetListItem(created) }
  }

  const [created] = await db
    .insert(assets)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      originalText: trimmed,
      type: 'note',
      url: null,
      timeText: command.timeText,
      dueAt: command.dueAt,
    })
    .returning()

  scheduleAssetEmbeddingBestEffort(created)

  return { kind: 'created', asset: toAssetListItem(created) }
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

export async function setTodoCompletion({
  userId,
  assetId,
  completed,
}: SetTodoCompletionInput): Promise<AssetListItem | null> {
  const [updated] = await db
    .update(assets)
    .set({
      completedAt: completed ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.userId, userId),
        eq(assets.type, 'todo')
      )
    )
    .returning()

  return updated ? toAssetListItem(updated) : null
}
