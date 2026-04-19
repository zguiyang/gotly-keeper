import type { AssetLifecycleStatus } from './asset-lifecycle.types'
import type { BookmarkMeta } from './bookmark-meta.types'

export type AssetListItem = {
  id: string
  originalText: string
  title: string
  excerpt: string
  type: 'note' | 'link' | 'todo'
  content?: string | null
  note?: string | null
  url: string | null
  timeText: string | null
  dueAt: Date | null
  completed: boolean
  bookmarkMeta?: BookmarkMeta | null
  lifecycleStatus?: AssetLifecycleStatus
  archivedAt?: Date | null
  trashedAt?: Date | null
  createdAt: Date
  updatedAt?: Date
}

export type AssetQueryResult = {
  query: string
  queryDescription: string
  results: AssetListItem[]
}

export type TodoReviewSource = {
  id: string
  title: string
  timeText: string | null
  dueAt: Date | null
}

export type TodoReviewResult = {
  headline: string
  summary: string
  nextActions: string[]
  sourceAssetIds: string[]
  sources: TodoReviewSource[]
  generatedAt: Date
}

export type NoteSummarySource = {
  id: string
  title: string
  createdAt: Date
}

export type NoteSummaryResult = {
  headline: string
  summary: string
  keyPoints: string[]
  sourceAssetIds: string[]
  sources: NoteSummarySource[]
  generatedAt: Date
}

export type BookmarkSummarySource = {
  id: string
  title: string
  url: string | null
  createdAt: Date
}

export type BookmarkSummaryResult = {
  headline: string
  summary: string
  keyPoints: string[]
  sourceAssetIds: string[]
  sources: BookmarkSummarySource[]
  generatedAt: Date
}

export type WorkspaceAssetActionResult =
  | { kind: 'created'; asset: AssetListItem }
  | { kind: 'query'; query: string; queryDescription: string; results: AssetListItem[] }
  | { kind: 'todo-review'; review: TodoReviewResult }
  | { kind: 'note-summary'; summary: NoteSummaryResult }
  | { kind: 'bookmark-summary'; summary: BookmarkSummaryResult }

// Do not remove this union. The stream result should map into the same discriminants.
