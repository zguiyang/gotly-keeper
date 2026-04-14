import 'server-only'

import { and, desc, eq, sql, type SQL } from 'drizzle-orm'

import { db } from '@/server/db'
import { assets, type Asset } from '@/server/db/schema'
import type { KeywordCandidate, SearchAssetsOptions } from './search.types'
import { scoreAssetForQuery } from './search.query-parser'
import {
  ASSET_LIST_LIMIT_MIN,
  ASSET_LIST_LIMIT_MAX,
} from '@/server/config/constants'

type KeywordSearchOptions = Omit<SearchAssetsOptions, 'query' | 'timeHint'> & {
  terms: string[]
  timeRangeHint?: { startsAt: Date; endsAt: Date } | null
}

export async function searchByKeyword({
  userId,
  terms,
  typeHint,
  completionHint,
  timeRangeHint,
  limit = 100,
}: KeywordSearchOptions): Promise<KeywordCandidate[]> {
  const conditions: SQL[] = [eq(assets.userId, userId)]

  if (typeHint) {
    conditions.push(eq(assets.type, typeHint))
  }

  if (completionHint === 'complete') {
    conditions.push(sql`${assets.completedAt} is not null`)
  }

  if (completionHint === 'incomplete') {
    conditions.push(sql`${assets.completedAt} is null`)
  }

  if (timeRangeHint && typeHint === 'todo') {
    const { startsAt, endsAt } = timeRangeHint
    const dueAtCondition = and(
      sql`${assets.dueAt} >= ${startsAt}`,
      sql`${assets.dueAt} < ${endsAt}`
    ) as SQL
    conditions.push(dueAtCondition)
  }

  const rows = await db
    .select()
    .from(assets)
    .where(and(...conditions))
    .orderBy(desc(assets.createdAt))
    .limit(Math.min(Math.max(limit, ASSET_LIST_LIMIT_MIN), ASSET_LIST_LIMIT_MAX))

  return rows
    .map((asset) => ({
      asset: toAssetListItem(asset),
      score: scoreAssetForQuery(asset, '', terms),
    }))
    .filter((candidate) => candidate.score > 0)
}

function toAssetListItem(asset: Asset) {
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
