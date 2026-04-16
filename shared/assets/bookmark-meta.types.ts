export const BOOKMARK_META_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED_PRIVATE_URL: 'skipped_private_url',
} as const

export type BookmarkMetaStatus =
  (typeof BOOKMARK_META_STATUS)[keyof typeof BOOKMARK_META_STATUS]

export type BookmarkEnrichedType = 'article' | 'video' | 'docs' | 'tool' | 'other'

export type BookmarkMeta = {
  status: BookmarkMetaStatus
  title: string | null
  icon: string | null
  bookmarkType: BookmarkEnrichedType | null
  description: string | null
  contentSummary: string | null
  errorCode: string | null
  errorMessage: string | null
  updatedAt: string
}

