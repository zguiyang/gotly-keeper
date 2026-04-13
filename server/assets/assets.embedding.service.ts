import 'server-only'

import { embed } from 'ai'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { cosineDistance } from 'drizzle-orm/sql/functions'

import { db } from '@/server/db'
import {
  assetEmbeddings,
  assets,
  type Asset,
} from '@/server/db/schema'
import { ASSET_EMBEDDING_DIMENSIONS, ASSET_EMBEDDING_TIMEOUT_MS } from './assets.embedding-config'
import { getAssetEmbeddingModel } from './assets.embedding-provider'

type SemanticSearchOptions = {
  userId: string
  query: string
  typeHint?: Asset['type'] | null
  completionHint?: 'complete' | 'incomplete' | null
  limit?: number
}

type SemanticSearchResult = {
  asset: Asset
  distance: number
}

function getAssetEmbeddingText(asset: Asset) {
  return [asset.originalText, asset.url, asset.timeText]
    .filter(Boolean)
    .join('\n')
}

export async function createAssetEmbedding(asset: Asset) {
  const model = getAssetEmbeddingModel()
  if (!model) return null

  const value = getAssetEmbeddingText(asset)
  if (!value.trim()) return null

  const { embedding } = await embed({
    model,
    value,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(ASSET_EMBEDDING_TIMEOUT_MS),
    providerOptions: {
      openaiCompatible: {
        dimensions: ASSET_EMBEDDING_DIMENSIONS,
      },
    },
  })

  const [created] = await db
    .insert(assetEmbeddings)
    .values({
      id: crypto.randomUUID(),
      assetId: asset.id,
      embedding,
      embeddedText: value,
      modelName: model.modelId,
      dimensions: ASSET_EMBEDDING_DIMENSIONS,
    })
    .onConflictDoUpdate({
      target: [
        assetEmbeddings.assetId,
        assetEmbeddings.modelName,
        assetEmbeddings.dimensions,
      ],
      set: {
        embedding,
        embeddedText: value,
        updatedAt: new Date(),
      },
    })
    .returning()

  return created
}

export async function createAssetEmbeddingBestEffort(asset: Asset) {
  try {
    return await createAssetEmbedding(asset)
  } catch (error) {
    console.warn('[assets.embedding] Failed to embed asset', {
      assetId: asset.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
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

export async function searchAssetsByEmbedding({
  userId,
  query,
  typeHint,
  completionHint,
  limit = 5,
}: SemanticSearchOptions): Promise<SemanticSearchResult[]> {
  const model = getAssetEmbeddingModel()
  const trimmed = query.trim()

  if (!model || !trimmed) return []

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

  const rows = await db
    .select({
      asset: assets,
      distance,
    })
    .from(assetEmbeddings)
    .innerJoin(assets, eq(assetEmbeddings.assetId, assets.id))
    .where(and(...conditions))
    .orderBy(distance)
    .limit(Math.min(Math.max(limit, 1), 20))

  return rows.map((row) => ({
    asset: row.asset,
    distance: Number(row.distance),
  }))
}