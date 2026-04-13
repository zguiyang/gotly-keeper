import 'server-only'

import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/server/db'
import { assets, type Asset } from '@/server/db/schema'
import { classifyAssetInput } from './assets.classifier'
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
  limit?: number
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
  note: ['普通记录', '记录', '笔记', '想法', '文案'],
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
  limit = 5,
}: SearchAssetsOptions): Promise<AssetListItem[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const terms = getAssetSearchTerms(trimmed)

  const rows = await db
    .select()
    .from(assets)
    .where(eq(assets.userId, userId))
    .orderBy(desc(assets.createdAt))
    .limit(100)

  return rows
    .map((asset) => ({
      asset,
      score: scoreAssetForQuery(asset, trimmed, terms),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.asset.createdAt.getTime() - a.asset.createdAt.getTime()
    })
    .slice(0, clampAssetListLimit(limit))
    .map((candidate) => toAssetListItem(candidate.asset))
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
    completed: asset.completedAt !== null,
    createdAt: asset.createdAt,
  }
}

export async function createAsset(input: {
  userId: string
  text: string
}): Promise<{ kind: 'created'; asset: AssetListItem } | { kind: 'query-not-supported' }> {
  const trimmed = input.text.trim()
  if (!trimmed) {
    throw new Error('EMPTY_INPUT')
  }

  const classification = classifyAssetInput(trimmed)

  if (classification.kind === 'query') {
    return { kind: 'query-not-supported' }
  }

  const [created] = await db
    .insert(assets)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      originalText: trimmed,
      type: classification.type,
      url: classification.url,
      timeText: classification.timeText,
      dueAt: classification.dueAt,
    })
    .returning()

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
