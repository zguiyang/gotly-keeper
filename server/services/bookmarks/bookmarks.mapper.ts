import 'server-only'

import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'

import type { Bookmark } from './bookmarks.schema'
import type { BookmarkListItem } from './bookmarks.types'

type BookmarkListRow = Partial<Pick<
  Bookmark,
  | 'id'
  | 'originalText'
  | 'title'
  | 'note'
  | 'summary'
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
  const bookmarkTitle = bookmark.title ?? bookmarkMeta?.title ?? null
  const bookmarkExcerpt =
    bookmark.note ??
    bookmark.summary ??
    bookmarkMeta?.description ??
    bookmarkMeta?.contentSummary ??
    bookmark.originalText

  return {
    id: bookmark.id,
    originalText: bookmark.originalText,
    title: bookmarkTitle || bookmark.originalText.slice(0, 32),
    excerpt: bookmarkExcerpt,
    url: bookmark.url,
    bookmarkMeta,
    lifecycleStatus: bookmark.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE,
    archivedAt: bookmark.archivedAt ?? null,
    trashedAt: bookmark.trashedAt ?? null,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  }
}
