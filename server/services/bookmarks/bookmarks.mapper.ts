import 'server-only'

import type { BookmarkMeta } from '@/shared/assets/bookmark-meta.types'
import type { Bookmark } from './bookmarks.schema'
import type { BookmarkListItem } from './bookmarks.types'

type BookmarkListRow = Pick<
  Bookmark,
  'id' | 'originalText' | 'url' | 'bookmarkMeta' | 'createdAt' | 'updatedAt'
>

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
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  }
}
