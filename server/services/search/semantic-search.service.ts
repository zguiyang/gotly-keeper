import 'server-only'

import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { cosineDistance } from 'drizzle-orm/sql/functions'

import { db } from '@/server/lib/db'
import {
  assetEmbeddings,
  assets,
  type Asset,
} from '@/server/lib/db/schema'
import {
  ASSET_EMBEDDING_CANDIDATE_MULTIPLIER,
  ASSET_EMBEDDING_MAX_COSINE_DISTANCE,
  ASSET_EMBEDDING_TIMEOUT_MS,
  ASSET_EMBEDDING_CANDIDATE_LIMIT_MAX,
  ASSET_LIST_LIMIT_MIN,
  ASSET_SEARCH_LIMIT_DEFAULT,
  ASSET_SEARCH_LIMIT_MAX,
} from '@/server/lib/config/constants'
import { getAssetEmbeddingModel } from '@/server/services/assets/assets.embedding-provider'
import { ASSET_EMBEDDING_DIMENSIONS } from '@/server/services/assets/assets.embedding-config'
import { createAssetEmbeddingBestEffort } from '@/server/services/assets/assets.embedding'
import type { SemanticCandidate } from './search.types'

type SemanticSearchOptions = {
  userId: string
  query: string
  typeHint?: Asset['type'] | null
  completionHint?: 'complete' | 'incomplete' | null
  limit?: number
}

export async function backfillMissingAssetEmbeddings(limit = 50) {
  const model = getAssetEmbeddingModel()
  if (!model) {
    return { attempted: 0, embedded: 0, failed: 0, skipped: true }
  }

  const rows = await db
    .select({ asset: assets })
    .from(assets)
    .leftJoin(
      assetEmbeddings,
      and(
        eq(assetEmbeddings.assetId, assets.id),
        eq(assetEmbeddings.modelName, model.modelId),
        eq(assetEmbeddings.dimensions, ASSET_EMBEDDING_DIMENSIONS)
      )
    )
    .where(isNull(assetEmbeddings.id))
    .orderBy(desc(assets.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100))

  let embedded = 0
  let failed = 0

  for (const row of rows) {
    const result = await createAssetEmbeddingBestEffort(row.asset)
    if (result) embedded += 1
    else failed += 1
  }

  return { attempted: rows.length, embedded, failed, skipped: false }
}

export async function searchByEmbedding({
  userId,
  query,
  typeHint,
  completionHint,
  limit = ASSET_SEARCH_LIMIT_DEFAULT,
}: SemanticSearchOptions): Promise<SemanticCandidate[]> {
  const model = getAssetEmbeddingModel()
  const trimmed = query.trim()

  if (!model || !trimmed) return []

  const { embed } = await import('ai')
  const { embedding } = await embed({
    model,
    value: trimmed,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(ASSET_EMBEDDING_TIMEOUT_MS),
    providerOptions: {
      openaiCompatible: {
        dimensions: ASSET_EMBEDDING_DIMENSIONS,
      },
    },
  })

  const distance = cosineDistance(assetEmbeddings.embedding, embedding)
  const conditions = [
    eq(assets.userId, userId),
    eq(assetEmbeddings.modelName, model.modelId),
    eq(assetEmbeddings.dimensions, ASSET_EMBEDDING_DIMENSIONS),
  ]

  if (typeHint) {
    conditions.push(eq(assets.type, typeHint))
  }

  if (completionHint === 'complete') {
    conditions.push(sql`${assets.completedAt} is not null`)
  }

  if (completionHint === 'incomplete') {
    conditions.push(sql`${assets.completedAt} is null`)
  }

  const clampedLimit = Math.min(Math.max(limit, ASSET_LIST_LIMIT_MIN), ASSET_SEARCH_LIMIT_MAX)
  const candidateLimit = Math.min(
    Math.max(clampedLimit * ASSET_EMBEDDING_CANDIDATE_MULTIPLIER, clampedLimit),
    ASSET_EMBEDDING_CANDIDATE_LIMIT_MAX
  )

  const rows = await db
    .select({
      asset: assets,
      distance,
    })
    .from(assetEmbeddings)
    .innerJoin(assets, eq(assetEmbeddings.assetId, assets.id))
    .where(and(...conditions))
    .orderBy(distance)
    .limit(candidateLimit)

  return rows
    .map((row) => ({
      asset: row.asset,
      distance: Number(row.distance),
    }))
    .filter((row) => row.distance <= ASSET_EMBEDDING_MAX_COSINE_DISTANCE)
    .slice(0, clampedLimit)
}
