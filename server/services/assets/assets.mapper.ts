import 'server-only'

import { type Asset } from '@/server/lib/db/schema'
import { type AssetListItem } from '@/shared/assets/assets.types'

export function toAssetListItem(asset: Asset): AssetListItem {
  const bookmarkTitle = asset.type === 'link' ? asset.bookmarkMeta?.title : null
  const bookmarkExcerpt =
    asset.type === 'link'
      ? (asset.bookmarkMeta?.description ?? asset.bookmarkMeta?.contentSummary)
      : null

  return {
    id: asset.id,
    originalText: asset.originalText,
    title: bookmarkTitle || asset.originalText.slice(0, 32),
    excerpt: bookmarkExcerpt || asset.originalText,
    type: asset.type,
    url: asset.url,
    timeText: asset.timeText,
    dueAt: asset.dueAt,
    completed: asset.completedAt !== null,
    bookmarkMeta: asset.bookmarkMeta ?? null,
    createdAt: asset.createdAt,
  }
}
