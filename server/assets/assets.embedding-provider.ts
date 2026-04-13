import 'server-only'

import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

import { serverEnv } from '@/server/env'
import { ASSET_EMBEDDING_DIMENSIONS } from './assets.embedding-config'

export function getAssetEmbeddingModel() {
  const { apiKey, url, embeddingModelName, embeddingDimensions } = serverEnv.aiGateway

  if (!apiKey || !url || !embeddingModelName || !embeddingDimensions) {
    return null
  }

  if (embeddingDimensions !== ASSET_EMBEDDING_DIMENSIONS) {
    console.warn(
      `[assets.embedding] AI_EMBEDDING_DIMENSIONS=${embeddingDimensions} does not match schema dimension ${ASSET_EMBEDDING_DIMENSIONS}`
    )
    return null
  }

  return createOpenAICompatible({
    name: 'dashscope',
    apiKey,
    baseURL: url,
  }).embeddingModel(embeddingModelName)
}