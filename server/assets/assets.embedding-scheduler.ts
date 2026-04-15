import 'server-only'

import { after } from 'next/server'

import { type Asset } from '@/server/db/schema'
import { createAssetEmbeddingBestEffort } from '@/server/search/semantic-search.service'

export function scheduleAssetEmbeddingBestEffort(asset: Asset) {
  after(async () => {
    await createAssetEmbeddingBestEffort(asset)
  })
}