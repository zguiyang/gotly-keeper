import 'server-only'

import {
  createAsset,
  listAssets,
  listLinkAssets,
  listNoteAssets,
  listRecentAssets,
  listTodoAssets,
  setTodoCompletion,
} from '@/server/services/assets/assets.service'
import { searchAssets } from '@/server/services/search'

import { ASSET_SEARCH_LIMIT_DEFAULT } from '../../lib/config/constants'

import { summarizeWorkspaceRecentBookmarksInternal } from './bookmarks.summary'
import {
  buildPendingBookmarkMetaForResponse,
  scheduleBookmarkEnrichTask,
} from './bookmark-enrich.module'
import { summarizeWorkspaceRecentNotesInternal } from './notes.summary'
import { reviewWorkspaceUnfinishedTodosInternal } from './todos.review'

import type {
  AssetListItem,
  BookmarkSummaryResult,
  NoteSummaryResult,
  TodoReviewResult,
  WorkspaceAssetActionResult,
} from '@/shared/assets/assets.types'

export const WORKSPACE_MODULE_ERROR_CODES = {
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
} as const

export type WorkspaceModuleErrorCode =
  (typeof WORKSPACE_MODULE_ERROR_CODES)[keyof typeof WORKSPACE_MODULE_ERROR_CODES]

export class WorkspaceModuleError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly code: WorkspaceModuleErrorCode = WORKSPACE_MODULE_ERROR_CODES.TODO_NOT_FOUND
  ) {
    super(publicMessage)
    this.name = 'WorkspaceModuleError'
  }
}

export async function createWorkspaceAsset(input: {
  userId: string
  text: string
}): Promise<WorkspaceAssetActionResult> {
  const result = await createAsset({ userId: input.userId, text: input.text })

  if (result.kind === 'search') {
    const results = await searchAssets({
      userId: input.userId,
      query: result.query || input.text,
      typeHint: result.typeHint,
      timeHint: result.timeHint,
      completionHint: result.completionHint,
      limit: ASSET_SEARCH_LIMIT_DEFAULT,
    })

    return {
      kind: 'query',
      query: result.query || input.text,
      results,
    }
  }

  if (result.kind === 'summary') {
    if (result.summaryTarget === 'unfinished_todos') {
      const review = await reviewWorkspaceUnfinishedTodosInternal(input.userId)
      return { kind: 'todo-review', review }
    }
    if (result.summaryTarget === 'recent_notes') {
      const summary = await summarizeWorkspaceRecentNotesInternal(input.userId)
      return { kind: 'note-summary', summary }
    }
    const summary = await summarizeWorkspaceRecentBookmarksInternal(input.userId)
    return { kind: 'bookmark-summary', summary }
  }

  if (result.kind === 'created' && result.asset.type === 'link' && result.asset.url) {
    result.asset.bookmarkMeta = buildPendingBookmarkMetaForResponse()

    void scheduleBookmarkEnrichTask({
      bookmarkId: result.asset.id,
      userId: input.userId,
      url: result.asset.url,
    })
  }

  return { kind: 'created', asset: result.asset }
}

export async function setWorkspaceTodoCompletion(input: {
  userId: string
  assetId: string
  completed: boolean
}): Promise<AssetListItem> {
  const updated = await setTodoCompletion({
    userId: input.userId,
    assetId: input.assetId,
    completed: input.completed,
  })

  if (!updated) {
    throw new WorkspaceModuleError(
      '没有找到这条待办，或你没有权限更新它。',
      WORKSPACE_MODULE_ERROR_CODES.TODO_NOT_FOUND
    )
  }

  return updated
}

type AssetType = 'note' | 'link' | 'todo'

export async function listWorkspaceAssets(input: {
  userId: string
  type?: AssetType
  limit?: number
}): Promise<AssetListItem[]> {
  return listAssets(input)
}

export async function listWorkspaceLinkAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  return listLinkAssets(userId, limit)
}

export async function listWorkspaceNoteAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  return listNoteAssets(userId, limit)
}

export async function listWorkspaceRecentAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  return listRecentAssets(userId, limit)
}

export async function listWorkspaceTodoAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  return listTodoAssets(userId, limit)
}

export async function reviewWorkspaceUnfinishedTodos(input: {
  userId: string
}): Promise<TodoReviewResult> {
  return reviewWorkspaceUnfinishedTodosInternal(input.userId)
}

export async function summarizeWorkspaceRecentNotes(input: {
  userId: string
}): Promise<NoteSummaryResult> {
  return summarizeWorkspaceRecentNotesInternal(input.userId)
}

export async function summarizeWorkspaceRecentBookmarks(input: {
  userId: string
}): Promise<BookmarkSummaryResult> {
  return summarizeWorkspaceRecentBookmarksInternal(input.userId)
}
