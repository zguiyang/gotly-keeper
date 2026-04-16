import type { BookmarkEnrichedType } from '@/shared/assets/bookmark-meta.types'

export type BookmarkEnrichTask = {
  taskId: string
  bookmarkId: string
  userId: string
  url: string
  traceId: string
  createdAt: string
}

export type BookmarkEnrichResult = {
  taskId: string
  bookmarkId: string
  success: boolean
  data?: {
    title: string | null
    icon: string | null
    bookmarkType: BookmarkEnrichedType | null
    description: string | null
    contentSummary: string | null
  }
  error?: {
    code: string
    message: string
    retryable: false
  }
}

