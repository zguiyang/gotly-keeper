import 'server-only'

import { type Asset } from '@/server/lib/db/schema'
import { type BookmarkMeta } from '@/shared/assets/bookmark-meta.types'
import { type AssetListItem } from '@/shared/assets/assets.types'

type AssetListRow = Pick<
  Asset,
  | 'id'
  | 'originalText'
  | 'type'
  | 'url'
  | 'timeText'
  | 'dueAt'
  | 'completedAt'
  | 'createdAt'
> & {
  bookmarkMeta?: BookmarkMeta | null
}

export function toAssetListItem(asset: AssetListRow): AssetListItem {
  const bookmarkMeta = asset.bookmarkMeta ?? null
  const bookmarkTitle = asset.type === 'link' ? bookmarkMeta?.title : null
  const bookmarkExcerpt =
    asset.type === 'link'
      ? (bookmarkMeta?.description ?? bookmarkMeta?.contentSummary)
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
    bookmarkMeta,
    createdAt: asset.createdAt,
  }
}
