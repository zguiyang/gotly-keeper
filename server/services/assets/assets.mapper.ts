import 'server-only'

import { type Asset } from '@/server/lib/db/schema'
import { type AssetListItem } from '@/shared/assets/assets.types'

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
