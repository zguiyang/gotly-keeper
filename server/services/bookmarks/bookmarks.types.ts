import 'server-only'

import type { BookmarkMeta } from '@/shared/assets/bookmark-meta.types'

export type BookmarkListItem = {
  id: string
  originalText: string
  title: string
  excerpt: string
  url: string
  bookmarkMeta: BookmarkMeta | null
  createdAt: Date
  updatedAt: Date
}
