import 'server-only'

import type { AssetLifecycleStatus } from '@/shared/assets/asset-lifecycle.types'

export type TodoListItem = {
  id: string
  originalText: string
  title: string
  excerpt: string
  lifecycleStatus: AssetLifecycleStatus
  archivedAt: Date | null
  trashedAt: Date | null
  timeText: string | null
  dueAt: Date | null
  completed: boolean
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
