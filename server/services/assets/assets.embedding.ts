import 'server-only'

import { db } from '@/server/lib/db'
import { assetEmbeddings, type Asset } from '@/server/lib/db/schema'
import {
  ASSET_EMBEDDING_TIMEOUT_MS,
} from '@/server/lib/config/constants'
import { getAssetEmbeddingModel } from './assets.embedding-provider'
import { ASSET_EMBEDDING_DIMENSIONS } from './assets.embedding-config'

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

  const { embed } = await import('ai')
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
