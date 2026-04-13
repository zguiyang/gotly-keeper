import 'server-only'

import { after } from 'next/server'

import { type Asset } from '@/server/db/schema'
import { createAssetEmbeddingBestEffort } from './assets.embedding.service'

export function scheduleAssetEmbeddingBestEffort(asset: Asset) {
  after(async () => {
    await createAssetEmbeddingBestEffort(asset)
  })
}