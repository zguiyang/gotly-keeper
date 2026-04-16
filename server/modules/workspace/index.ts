import 'server-only'

// [Phase C] Future imports - uncomment when new services are available
// import { createNote, listNotes, type NoteListItem } from '@/server/services/notes'
// import { createTodo, listTodos, setTodoCompletion, type TodoListItem } from '@/server/services/todos'
// import { createBookmark, listBookmarks, type BookmarkListItem } from '@/server/services/bookmarks'

// [Phase C] Legacy imports - to be replaced in Phase D
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

// [Phase C] WorkspaceAssetItem - aggregation type for /workspace/all
// Represents items from all three domains (notes, todos, bookmarks)
export type WorkspaceAssetItem = AssetListItem

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
  // [Phase C] TODO: Replace with domain-specific service calls
  // - For notes: use notes.mutation.createNote()
  // - For todos: use todos.mutation.createTodo()
  // - For bookmarks: use bookmarks.mutation.createBookmark()
  // Determine type from text parsing and call appropriate service
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
  // [Phase C] TODO: Replace with todos.mutation.setTodoCompletion()
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
  // [Phase C] TODO: Replace with aggregation from three services
  // - notes.query.listNotes() for type='note'
  // - todos.query.listTodos() for type='todo'
  // - bookmarks.query.listBookmarks() for type='link'
  // - Aggregate all three for undefined type
  return listAssets(input)
}

export async function listWorkspaceLinkAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  // [Phase C] TODO: Replace with bookmarks.query.listBookmarks()
  return listLinkAssets(userId, limit)
}

export async function listWorkspaceNoteAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  // [Phase C] TODO: Replace with notes.query.listNotes()
  return listNoteAssets(userId, limit)
}

export async function listWorkspaceRecentAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  // [Phase C] TODO: Replace with aggregation from three services
  // - notes.query.listRecentNotes()
  // - todos.query.listRecentTodos()
  // - bookmarks.query.listRecentBookmarks()
  // - Merge and sort by createdAt
  return listRecentAssets(userId, limit)
}

export async function listWorkspaceTodoAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  // [Phase C] TODO: Replace with todos.query.listTodos()
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
