import 'server-only'

import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'

import type { Bookmark } from './bookmarks.schema'
import type { BookmarkListItem } from './bookmarks.types'

type BookmarkListRow = Partial<Pick<
  Bookmark,
  | 'id'
  | 'originalText'
  | 'url'
  | 'bookmarkMeta'
  | 'lifecycleStatus'
  | 'archivedAt'
  | 'trashedAt'
  | 'createdAt'
  | 'updatedAt'
>> & Pick<Bookmark, 'id' | 'originalText' | 'url' | 'bookmarkMeta' | 'createdAt' | 'updatedAt'>

export function toBookmarkListItem(bookmark: BookmarkListRow): BookmarkListItem {
  const bookmarkMeta = bookmark.bookmarkMeta ?? null
  const bookmarkTitle = bookmarkMeta?.title ?? null

  return {
    id: bookmark.id,
    originalText: bookmark.originalText,
    title: bookmarkTitle || bookmark.originalText.slice(0, 32),
    excerpt: bookmarkMeta?.description ?? bookmarkMeta?.contentSummary ?? bookmark.originalText,
    url: bookmark.url,
    bookmarkMeta,
    lifecycleStatus: bookmark.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: bookmark.archivedAt ?? null,
    trashedAt: bookmark.trashedAt ?? null,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  }
}
