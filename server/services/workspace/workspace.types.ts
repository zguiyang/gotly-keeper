import 'server-only'

import {
  type AssetListItem,
  type WorkspaceAssetActionResult,
  type TodoReviewResult,
  type NoteSummaryResult,
  type BookmarkSummaryResult,
} from '@/shared/assets/assets.types'

export type { AssetListItem, WorkspaceAssetActionResult, TodoReviewResult, NoteSummaryResult, BookmarkSummaryResult }

export type CreateWorkspaceAssetInput = {
  userId: string
  text: string
}

export type CreateWorkspaceAssetOutput = WorkspaceAssetActionResult

export type SetTodoCompletionInput = {
  userId: string
  assetId: string
  completed: boolean
}

export type ReviewUnfinishedTodosInput = {
  userId: string
}

export type SummarizeRecentNotesInput = {
  userId: string
}

export type SummarizeRecentBookmarksInput = {
  userId: string
}
