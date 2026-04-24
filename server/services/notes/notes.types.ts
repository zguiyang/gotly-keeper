import 'server-only'

import type { AssetLifecycleStatus } from '@/shared/assets/asset-lifecycle.types'

export type NoteListItem = {
  id: string
  originalText: string
  title: string
  excerpt: string
  content: string
  summary: string | null
  lifecycleStatus: AssetLifecycleStatus
  archivedAt: Date | null
  trashedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
