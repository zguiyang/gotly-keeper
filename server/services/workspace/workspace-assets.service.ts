import 'server-only'

import { deleteEmbeddingsForAsset } from '@/server/services/search/semantic-search.service'
import { createBookmark, listBookmarks, type BookmarkListItem } from '@/server/services/bookmarks'
import { createNote, listNotes, type NoteListItem } from '@/server/services/notes'
import { searchAssets } from '@/server/services/search'
import { createTodo, listTodos, setTodoCompletion, updateTodo, type TodoListItem } from '@/server/services/todos'
import { ASSET_LIFECYCLE_STATUS, type AssetLifecycleStatus } from '@/shared/assets/asset-lifecycle.types'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { type WorkspaceAgentTimeFilter } from '@/shared/workspace/workspace-run.types'

import {
  buildPendingBookmarkMetaForResponse,
  scheduleBookmarkEnrichTask,
} from '@/server/services/bookmark/bookmark-enrich.service'

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

function toAssetListItemFromNote(note: NoteListItem): AssetListItem {
  return {
    id: note.id,
    originalText: note.originalText,
    title: note.title,
    excerpt: note.excerpt,
    type: 'note',
    content: note.content,
    summary: note.summary,
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    bookmarkMeta: null,
    lifecycleStatus: note.lifecycleStatus,
    archivedAt: note.archivedAt,
    trashedAt: note.trashedAt,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

function toAssetListItemFromTodo(todo: TodoListItem): AssetListItem {
  return {
    id: todo.id,
    originalText: todo.originalText,
    title: todo.title,
    excerpt: todo.excerpt,
    type: 'todo',
    content: todo.content,
    url: null,
    timeText: todo.timeText,
    dueAt: todo.dueAt,
    completed: todo.completed,
    bookmarkMeta: null,
    lifecycleStatus: todo.lifecycleStatus,
    archivedAt: todo.archivedAt,
    trashedAt: todo.trashedAt,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  }
}

function toAssetListItemFromBookmark(bookmark: BookmarkListItem): AssetListItem {
  return {
    id: bookmark.id,
    originalText: bookmark.originalText,
    title: bookmark.title,
    excerpt: bookmark.excerpt,
    type: 'link',
    note: bookmark.note,
    summary: bookmark.summary,
    url: bookmark.url,
    timeText: null,
    dueAt: null,
    completed: false,
    bookmarkMeta: bookmark.bookmarkMeta,
    lifecycleStatus: bookmark.lifecycleStatus,
    archivedAt: bookmark.archivedAt,
    trashedAt: bookmark.trashedAt,
    createdAt: bookmark.createdAt,
    updatedAt: bookmark.updatedAt,
  }
}

export async function createWorkspaceNoteAsset(input: {
  userId: string
  text?: string
  rawInput?: string
  title?: string | null
  content?: string | null
  summary?: string | null
}): Promise<AssetListItem> {
  const note = await createNote(
    input.rawInput !== undefined
      ? {
          userId: input.userId,
          rawInput: input.rawInput,
          title: input.title,
          content: input.content,
          summary: input.summary,
        }
      : {
          userId: input.userId,
          text: input.text ?? '',
        }
  )

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
  type?: 'note' | 'todo' | 'link' | null
  limit?: number
  lifecycleStatus?: AssetLifecycleStatus
}): Promise<AssetListItem[]> {
  const limit = input.limit ?? 50
  const lifecycleStatus = input.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE

  if (input.type === 'note') {
    const notes = await listNotes({ userId: input.userId, limit, lifecycleStatus })
    return notes.map(toAssetListItemFromNote)
  }

  if (input.type === 'link') {
    const bookmarks = await listBookmarks({ userId: input.userId, limit, lifecycleStatus })
    return bookmarks.map(toAssetListItemFromBookmark)
  }

  if (input.type === 'todo') {
    const todos = await listTodos({ userId: input.userId, limit, lifecycleStatus })
    return todos.map(toAssetListItemFromTodo)
  }

  const [notes, bookmarks, todos] = await Promise.all([
    listNotes({ userId: input.userId, limit, lifecycleStatus }),
    listBookmarks({ userId: input.userId, limit, lifecycleStatus }),
    listTodos({ userId: input.userId, limit, lifecycleStatus }),
  ])

  const items = [
    ...notes.map(toAssetListItemFromNote),
    ...bookmarks.map(toAssetListItemFromBookmark),
    ...todos.map(toAssetListItemFromTodo),
  ]

  items.sort((left, right) => {
    const createdAtDiff = right.createdAt.getTime() - left.createdAt.getTime()
    if (createdAtDiff !== 0) {
      return createdAtDiff
    }

    return right.id.localeCompare(left.id)
  })

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
