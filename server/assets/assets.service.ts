import 'server-only'

import { and, desc, eq, or, sql } from 'drizzle-orm'

import { db } from '@/server/db'
import { assets, type Asset } from '@/server/db/schema'
import { interpretAssetInput } from './assets.interpreter'
import {
  getAssetSearchTimeTextAliases,
  matchesAssetSearchTimeHint,
} from './assets.search-time'
import { parseAssetSearchTimeHint } from './assets.time'
import { scheduleAssetEmbeddingBestEffort } from './assets.embedding-scheduler'
import { searchAssetsByEmbedding } from './assets.embedding.service'
import { type AssetListItem } from '@/shared/assets/assets.types'

export { type AssetListItem }

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

function clampAssetListLimit(limit = 50) {
  return Math.min(Math.max(1, limit), 100)
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

const QUERY_FILLERS = [
  '帮我',
  '找一下',
  '查一下',
  '我',
  '最近',
  '上次',
  '之前',
  '记过',
  '记录过',
  '关于',
  '内容',
  '在哪',
  '哪里',
  '有哪些',
  '什么',
  '一下',
  '的',
  '吗',
  '么',
]

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[，。！？、,.!?;；:：()[\]{}"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getAssetSearchTerms(query: string) {
  let normalized = normalizeSearchText(query)

  for (const filler of QUERY_FILLERS) {
    normalized = normalized.replaceAll(filler, ' ')
  }

  return Array.from(
    new Set(
      normalized
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2)
    )
  ).slice(0, 8)
}

const ASSET_TYPE_TERMS: Record<AssetType, string[]> = {
  note: ['记录', '笔记', '想法', '文案'],
  link: ['书签', '链接', '文章', '收藏', '资料'],
  todo: ['待办', '待处理', '任务', '事项', '要做'],
}

function getTypeHintScore(query: string, type: AssetType) {
  return ASSET_TYPE_TERMS[type].some((term) => query.includes(term)) ? 2 : 0
}

function scoreAssetForQuery(asset: Asset, query: string, terms: string[]) {
  const searchable = normalizeSearchText(
    [
      asset.originalText,
      asset.url,
      asset.timeText,
      ASSET_TYPE_TERMS[asset.type].join(' '),
    ]
      .filter(Boolean)
      .join(' ')
  )

  let score = getTypeHintScore(query, asset.type)

  for (const term of terms) {
    if (searchable.includes(term)) {
      score += term.length >= 4 ? 3 : 2
    }
  }

  if (query.includes('这周') && asset.timeText?.includes('本周')) {
    score += 2
  }

  return score
}

export async function searchAssets({
  userId,
  query,
  typeHint,
  timeHint,
  completionHint,
  limit = 5,
}: SearchAssetsOptions): Promise<AssetListItem[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const conditions = [eq(assets.userId, userId)]

  if (typeHint) {
    conditions.push(eq(assets.type, typeHint))
  }

  if (completionHint === 'complete') {
    conditions.push(sql`${assets.completedAt} is not null`)
  }

  if (completionHint === 'incomplete') {
    conditions.push(sql`${assets.completedAt} is null`)
  }

  const timeRangeHint = parseAssetSearchTimeHint(timeHint)
  const timeFilter =
    timeRangeHint && typeHint === 'todo'
      ? { rangeHint: timeRangeHint, timeHint }
      : null

  if (timeFilter) {
    const dueAtCondition = and(
      sql`${assets.dueAt} >= ${timeFilter.rangeHint.startsAt}`,
      sql`${assets.dueAt} < ${timeFilter.rangeHint.endsAt}`
    )
    const timeTextConditions = getAssetSearchTimeTextAliases(timeFilter.timeHint).map(
      (alias) => sql`${assets.timeText} like ${`%${alias}%`}`
    )
    const timeCondition = or(dueAtCondition, ...timeTextConditions)

    if (timeCondition) {
      conditions.push(timeCondition)
    }
  }

  let semanticResults: Awaited<ReturnType<typeof searchAssetsByEmbedding>> = []

  try {
    semanticResults = (
      await searchAssetsByEmbedding({
        userId,
        query: trimmed,
        typeHint,
        completionHint,
        limit: clampAssetListLimit(limit),
      })
    ).filter(
      (result) =>
        !timeFilter ||
        matchesAssetSearchTimeHint(result.asset, timeFilter.rangeHint, timeFilter.timeHint)
    )
  } catch (error) {
    console.warn('[assets.search] Semantic search failed; using keyword fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const terms = getAssetSearchTerms(trimmed)

  const rows = await db
    .select()
    .from(assets)
    .where(and(...conditions))
    .orderBy(desc(assets.createdAt))
    .limit(100)

  const keywordCandidates = rows
    .filter(
      (asset) =>
        !timeFilter ||
        matchesAssetSearchTimeHint(asset, timeFilter.rangeHint, timeFilter.timeHint)
    )
    .map((asset) => {
      let score = scoreAssetForQuery(asset, trimmed, terms)

      if (timeHint && asset.timeText?.includes(timeHint)) {
        score += 2
      }

      return { asset: toAssetListItem(asset), score }
    })
    .filter((candidate) => candidate.score > 0)

  const ranked = new Map<string, { asset: AssetListItem; score: number }>()

  for (const result of semanticResults) {
    const asset = toAssetListItem(result.asset)
    ranked.set(asset.id, {
      asset,
      score: Math.max(0, 10 - result.distance * 10),
    })
  }

  for (const candidate of keywordCandidates) {
    const existing = ranked.get(candidate.asset.id)
    ranked.set(candidate.asset.id, {
      asset: candidate.asset,
      score: (existing?.score ?? 0) + candidate.score,
    })
  }

  return Array.from(ranked.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, clampAssetListLimit(limit))
    .map((candidate) => candidate.asset)
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
}): Promise<{ kind: 'created'; asset: AssetListItem } | AssetSearchCommand> {
  const trimmed = input.text.trim()
  if (!trimmed) {
    throw new Error('EMPTY_INPUT')
  }

  const command = await interpretAssetInput(trimmed)

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

export async function listRecentAssets(userId: string, limit = 6): Promise<AssetListItem[]> {
  const clampedLimit = Math.min(Math.max(1, limit), 20)

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
