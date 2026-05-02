import 'server-only'

import {
  buildPendingBookmarkMetaForResponse,
  scheduleBookmarkEnrichTask,
} from '@/server/services/bookmark/bookmark-enrich.service'
import {
  createBookmark,
  findDuplicateBookmarks,
  listBookmarks,
  updateBookmark,
} from '@/server/services/bookmarks'
import {
  createNote,
  findDuplicateNotes,
  listNotes,
  updateNote,
} from '@/server/services/notes'
import { searchAssets } from '@/server/services/search'
import { deleteEmbeddingsForAsset } from '@/server/services/search/semantic-search.service'
import {
  createTodo,
  findDuplicateTodos,
  listTodos,
  setTodoCompletion,
  updateTodo,
} from '@/server/services/todos'
import {
  toAssetListItemFromBookmark,
  toAssetListItemFromNote,
  toAssetListItemFromTodo,
} from '@/server/services/workspace/asset-list-item'
import { ASSET_LIFECYCLE_STATUS, type AssetLifecycleStatus } from '@/shared/assets/asset-lifecycle.types'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { WorkspaceCandidate } from '@/shared/workspace/workspace-run-protocol'
import type { WorkspaceAgentTimeFilter } from '@/shared/workspace/workspace-run.types'

export const WORKSPACE_ASSETS_ERROR_CODES = {
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
  ASSET_NOT_FOUND: 'ASSET_NOT_FOUND',
} as const

export type WorkspaceAssetsErrorCode =
  (typeof WORKSPACE_ASSETS_ERROR_CODES)[keyof typeof WORKSPACE_ASSETS_ERROR_CODES]

export class WorkspaceAssetsError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly code: WorkspaceAssetsErrorCode = WORKSPACE_ASSETS_ERROR_CODES.ASSET_NOT_FOUND
  ) {
    super(publicMessage)
    this.name = 'WorkspaceAssetsError'
  }
}

export type WorkspaceCreateDuplicateCheckStep = {
  stepId: string
  action: 'create_note' | 'create_todo' | 'create_bookmark'
  target: 'notes' | 'todos' | 'bookmarks'
  title?: string
  content?: string
  url?: string
  timeText?: string | null
  dueAt?: Date | null
}

export type WorkspaceCreateDuplicateCheckResult = {
  stepId: string
  target: 'note' | 'todo' | 'bookmark'
  duplicates: WorkspaceCandidate[]
}

type WorkspaceAssetType = 'note' | 'todo' | 'link'

type WorkspaceAssetListAdapter = {
  list: (input: {
    userId: string
    limit: number
    lifecycleStatus: AssetLifecycleStatus
  }) => Promise<AssetListItem[]>
}

function compareWorkspaceAssetsDesc(left: AssetListItem, right: AssetListItem): number {
  const createdAtDiff = right.createdAt.getTime() - left.createdAt.getTime()
  if (createdAtDiff !== 0) {
    return createdAtDiff
  }

  return right.id.localeCompare(left.id)
}

function getWorkspaceAssetListAdapter(assetType: WorkspaceAssetType): WorkspaceAssetListAdapter {
  if (assetType === 'note') {
    return {
      list: async ({ userId, limit, lifecycleStatus }) => {
        const notes = await listNotes({ userId, limit, lifecycleStatus })
        return notes.map(toAssetListItemFromNote)
      },
    }
  }

  if (assetType === 'todo') {
    return {
      list: async ({ userId, limit, lifecycleStatus }) => {
        const todos = await listTodos({ userId, limit, lifecycleStatus })
        return todos.map(toAssetListItemFromTodo)
      },
    }
  }

  return {
    list: async ({ userId, limit, lifecycleStatus }) => {
      const bookmarks = await listBookmarks({ userId, limit, lifecycleStatus })
      return bookmarks.map(toAssetListItemFromBookmark)
    },
  }
}

function toCandidateLabel(input: {
  title?: string | null
  fallback: string
}) {
  const title = input.title?.trim()
  return title && title.length > 0 ? title : input.fallback
}

export async function findWorkspaceCreateDuplicates(input: {
  userId: string
  steps: WorkspaceCreateDuplicateCheckStep[]
}): Promise<WorkspaceCreateDuplicateCheckResult[]> {
  const results: WorkspaceCreateDuplicateCheckResult[] = []

  for (const step of input.steps) {
    if (step.action === 'create_bookmark') {
      const url = step.url?.trim()
      if (!url) {
        continue
      }

      const duplicates = await findDuplicateBookmarks({
        userId: input.userId,
        url,
      })

      if (duplicates.length > 0) {
        results.push({
          stepId: step.stepId,
          target: 'bookmark',
          duplicates: duplicates.map((bookmark) => ({
            id: bookmark.id,
            label: toCandidateLabel({
              title: bookmark.title,
              fallback: bookmark.url ?? '已有书签',
            }),
            reason: 'URL 完全一致',
          })),
        })
      }

      continue
    }

    if (step.action === 'create_todo') {
      const title = step.title?.trim()
      if (!title) {
        continue
      }

      const duplicates = await findDuplicateTodos({
        userId: input.userId,
        title,
        dueAt: step.dueAt ?? null,
        timeText: step.timeText ?? null,
      })

      if (duplicates.length > 0) {
        results.push({
          stepId: step.stepId,
          target: 'todo',
          duplicates: duplicates.map((todo) => ({
            id: todo.id,
            label: toCandidateLabel({
              title: todo.title,
              fallback: todo.originalText,
            }),
            reason: '标题和时间完全一致',
          })),
        })
      }

      continue
    }

    const content = step.content?.trim()
    if (!content) {
      continue
    }

    const duplicates = await findDuplicateNotes({
      userId: input.userId,
      content,
    })

    if (duplicates.length > 0) {
      results.push({
        stepId: step.stepId,
        target: 'note',
        duplicates: duplicates.map((note) => ({
          id: note.id,
          label: toCandidateLabel({
            title: note.title,
            fallback: note.originalText,
          }),
          reason: '内容完全一致',
        })),
      })
    }
  }

  return results
}

export async function createWorkspaceNoteAsset(input: {
  userId: string
  rawInput: string
  title?: string | null
  content?: string | null
  summary?: string | null
}): Promise<AssetListItem> {
  const note = await createNote({
    userId: input.userId,
    rawInput: input.rawInput,
    title: input.title,
    content: input.content,
    summary: input.summary,
  })

  return toAssetListItemFromNote(note)
}

export async function createWorkspaceTodoAsset(input: {
  userId: string
  rawInput: string
  title: string | null
  content: string | null
  timeText: string | null
  dueAt: Date | null
}): Promise<AssetListItem> {
  const todo = await createTodo({
    userId: input.userId,
    rawInput: input.rawInput,
    title: input.title,
    content: input.content,
    timeText: input.timeText,
    dueAt: input.dueAt,
  })

  return toAssetListItemFromTodo(todo)
}

export async function createWorkspaceLinkAsset(input: {
  userId: string
  rawInput: string
  url: string
  title: string | null
  note: string | null
  summary: string | null
}): Promise<AssetListItem> {
  const bookmark = await createBookmark({
    userId: input.userId,
    rawInput: input.rawInput,
    url: input.url,
    title: input.title,
    note: input.note,
    summary: input.summary,
  })

  const asset = toAssetListItemFromBookmark(bookmark)
  asset.bookmarkMeta = buildPendingBookmarkMetaForResponse()

  void scheduleBookmarkEnrichTask({
    bookmarkId: asset.id,
    userId: input.userId,
    url: input.url,
  })

  return asset
}

export async function updateWorkspaceNoteAsset(input: {
  userId: string
  assetId: string
  rawInput: string
  title?: string | null
  content?: string | null
  summary?: string | null
}): Promise<AssetListItem> {
  const updated = await updateNote({
    userId: input.userId,
    noteId: input.assetId,
    rawInput: input.rawInput,
    title: input.title,
    content: input.content,
    summary: input.summary,
  })

  if (!updated) {
    throw new WorkspaceAssetsError(
      '没有找到这条笔记，或你没有权限更新它。',
      WORKSPACE_ASSETS_ERROR_CODES.ASSET_NOT_FOUND
    )
  }

  await deleteEmbeddingsForAsset({ assetType: 'note', assetId: updated.id })
  return toAssetListItemFromNote(updated)
}

export async function updateWorkspaceTodoAsset(input: {
  userId: string
  assetId: string
  rawInput: string
  title: string | null
  content: string | null
  timeText: string | null
  dueAt: Date | null
}): Promise<AssetListItem> {
  const updated = await updateTodo({
    userId: input.userId,
    todoId: input.assetId,
    rawInput: input.rawInput,
    title: input.title,
    content: input.content,
    timeText: input.timeText,
    dueAt: input.dueAt,
  })

  if (!updated) {
    throw new WorkspaceAssetsError(
      '没有找到这条待办，或你没有权限更新它。',
      WORKSPACE_ASSETS_ERROR_CODES.ASSET_NOT_FOUND
    )
  }

  await deleteEmbeddingsForAsset({ assetType: 'todo', assetId: updated.id })
  return toAssetListItemFromTodo(updated)
}

export async function updateWorkspaceLinkAsset(input: {
  userId: string
  assetId: string
  rawInput: string
  url: string
  title?: string | null
  note?: string | null
  summary?: string | null
}): Promise<AssetListItem> {
  const updated = await updateBookmark({
    userId: input.userId,
    bookmarkId: input.assetId,
    rawInput: input.rawInput,
    url: input.url,
    title: input.title,
    note: input.note,
    summary: input.summary,
  })

  if (!updated) {
    throw new WorkspaceAssetsError(
      '没有找到这条书签，或你没有权限更新它。',
      WORKSPACE_ASSETS_ERROR_CODES.ASSET_NOT_FOUND
    )
  }

  await deleteEmbeddingsForAsset({ assetType: 'link', assetId: updated.item.id })

  if (updated.urlChanged && updated.item.url) {
    void scheduleBookmarkEnrichTask({
      bookmarkId: updated.item.id,
      userId: input.userId,
      url: updated.item.url,
    })
  }

  return toAssetListItemFromBookmark(updated.item)
}

export async function setWorkspaceTodoAssetCompletion(input: {
  userId: string
  assetId: string
  completed: boolean
}): Promise<AssetListItem> {
  const updated = await setTodoCompletion({
    userId: input.userId,
    todoId: input.assetId,
    completed: input.completed,
  })

  if (!updated) {
    throw new WorkspaceAssetsError(
      '没有找到这条待办，或你没有权限更新它。',
      WORKSPACE_ASSETS_ERROR_CODES.TODO_NOT_FOUND
    )
  }

  return toAssetListItemFromTodo(updated)
}

export async function listWorkspaceAssets(input: {
  userId: string
  type?: WorkspaceAssetType | null
  limit?: number
  lifecycleStatus?: AssetLifecycleStatus
}): Promise<AssetListItem[]> {
  const limit = input.limit ?? 50
  const lifecycleStatus = input.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE

  if (input.type === 'note') {
    return getWorkspaceAssetListAdapter('note').list({
      userId: input.userId,
      limit,
      lifecycleStatus,
    })
  }

  if (input.type === 'link') {
    return getWorkspaceAssetListAdapter('link').list({
      userId: input.userId,
      limit,
      lifecycleStatus,
    })
  }

  if (input.type === 'todo') {
    return getWorkspaceAssetListAdapter('todo').list({
      userId: input.userId,
      limit,
      lifecycleStatus,
    })
  }

  const [notes, bookmarks, todos] = await Promise.all([
    getWorkspaceAssetListAdapter('note').list({
      userId: input.userId,
      limit,
      lifecycleStatus,
    }),
    getWorkspaceAssetListAdapter('link').list({
      userId: input.userId,
      limit,
      lifecycleStatus,
    }),
    getWorkspaceAssetListAdapter('todo').list({
      userId: input.userId,
      limit,
      lifecycleStatus,
    }),
  ])

  const items = [...notes, ...bookmarks, ...todos]
  items.sort(compareWorkspaceAssetsDesc)

  return items.slice(0, limit)
}

export async function searchWorkspaceAssets(input: {
  userId: string
  query: string
  typeHint?: 'todo' | 'note' | 'link' | null
  timeFilter?: WorkspaceAgentTimeFilter | null
  completionHint?: 'complete' | 'incomplete' | null
}): Promise<AssetListItem[]> {
  return searchAssets({
    userId: input.userId,
    query: input.query,
    typeHint: input.typeHint ?? null,
    timeFilter: input.timeFilter ?? null,
    completionHint: input.completionHint ?? null,
  })
}
