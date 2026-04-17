import 'server-only'

import type { AssetLifecycleStatus } from '@/shared/assets/asset-lifecycle.types'
import type { BookmarkMeta } from '@/shared/assets/bookmark-meta.types'

export type BookmarkListItem = {
  id: string
  originalText: string
  title: string
  excerpt: string
  url: string | null
  bookmarkMeta: BookmarkMeta | null
  lifecycleStatus: AssetLifecycleStatus
  archivedAt: Date | null
  trashedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
