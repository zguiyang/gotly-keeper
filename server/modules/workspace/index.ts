import 'server-only'

import {
  canArchive,
  canMoveToTrash,
  canPurge,
  canRestoreFromTrash,
  canUnarchive,
} from '@/server/services/assets/asset-lifecycle'
import {
  archiveBookmark,
  createBookmark,
  getBookmarkById,
  listBookmarks,
  moveBookmarkToTrash,
  purgeBookmark,
  restoreBookmarkFromTrash,
  unarchiveBookmark,
  updateBookmark,
  type BookmarkListItem,
} from '@/server/services/bookmarks'
import {
  archiveNote,
  createNote,
  getNoteById,
  listNotes,
  moveNoteToTrash,
  purgeNote,
  restoreNoteFromTrash,
  unarchiveNote,
  updateNote,
  type NoteListItem,
} from '@/server/services/notes'
import { deleteEmbeddingsForAsset } from '@/server/services/search/semantic-search.service'
import {
  archiveTodo,
  createTodo,
  getTodoById,
  listTodos,
  moveTodoToTrash,
  purgeTodo,
  restoreTodoFromTrash,
  setTodoCompletion,
  unarchiveTodo,
  updateTodo,
  type TodoListItem,
} from '@/server/services/todos'
import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'

import {
  buildPendingBookmarkMetaForResponse,
  scheduleBookmarkEnrichTask,
} from './bookmark-enrich.module'
import { summarizeWorkspaceRecentBookmarksInternal } from './bookmarks.summary'
import { summarizeWorkspaceRecentNotesInternal } from './notes.summary'
import { reviewWorkspaceUnfinishedTodosInternal } from './todos.review'


import type {
  AssetListItem,
  BookmarkSummaryResult,
  NoteSummaryResult,
  TodoReviewResult,
  WorkspaceAssetActionResult,
} from '@/shared/assets/assets.types'

export type WorkspaceAssetItem = AssetListItem

export const WORKSPACE_MODULE_ERROR_CODES = {
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
  ASSET_NOT_FOUND: 'ASSET_NOT_FOUND',
  INVALID_ASSET_TYPE: 'INVALID_ASSET_TYPE',
  INVALID_LIFECYCLE_TRANSITION: 'INVALID_LIFECYCLE_TRANSITION',
  PURGE_REQUIRES_TRASHED_ASSET: 'PURGE_REQUIRES_TRASHED_ASSET',
} as const

export type WorkspaceModuleErrorCode =
  (typeof WORKSPACE_MODULE_ERROR_CODES)[keyof typeof WORKSPACE_MODULE_ERROR_CODES]

export class WorkspaceModuleError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly code: WorkspaceModuleErrorCode = WORKSPACE_MODULE_ERROR_CODES.ASSET_NOT_FOUND
  ) {
    super(publicMessage)
    this.name = 'WorkspaceModuleError'
  }
}

const URL_REGEX = /https?:\/\/[^\s]+/g
const TODO_KEYWORDS = ['记得', '提醒', '待办', '要', '处理', '发', '提交', '整理', '预订', '回复']

function extractUrl(text: string): string | null {
  const matches = text.match(URL_REGEX)
  return matches ? matches[0] : null
}

function hasTodoIntent(text: string): boolean {
  return TODO_KEYWORDS.some((kw) => text.includes(kw))
}

type AssetInputClassification =
  | { kind: 'note' }
  | { kind: 'link'; url: string }
  | { kind: 'todo' }

function classifyAssetInput(text: string): AssetInputClassification {
  const url = extractUrl(text)
  if (url) {
    return { kind: 'link', url }
  }

  if (hasTodoIntent(text)) {
    return { kind: 'todo' }
  }

  return { kind: 'note' }
}

function toAssetListItemFromNote(note: NoteListItem): AssetListItem {
  return {
    id: note.id,
    originalText: note.originalText,
    title: note.title,
    excerpt: note.excerpt,
    type: 'note',
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

export async function createWorkspaceAsset(input: {
  userId: string
  text: string
}): Promise<WorkspaceAssetActionResult> {
  const classification = classifyAssetInput(input.text)

  if (classification.kind === 'link') {
    const bookmark = await createBookmark({
      userId: input.userId,
      text: input.text,
      url: classification.url,
    })

    const asset = toAssetListItemFromBookmark(bookmark)
    asset.bookmarkMeta = buildPendingBookmarkMetaForResponse()

    void scheduleBookmarkEnrichTask({
      bookmarkId: asset.id,
      userId: input.userId,
      url: asset.url!,
    })

    return { kind: 'created', asset }
  }

  if (classification.kind === 'todo') {
    const todo = await createTodo({
      userId: input.userId,
      text: input.text,
    })

    return { kind: 'created', asset: toAssetListItemFromTodo(todo) }
  }

  const note = await createNote({
    userId: input.userId,
    text: input.text,
  })

  return { kind: 'created', asset: toAssetListItemFromNote(note) }
}

export async function setWorkspaceTodoCompletion(input: {
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
    throw new WorkspaceModuleError(
      '没有找到这条待办，或你没有权限更新它。',
      WORKSPACE_MODULE_ERROR_CODES.TODO_NOT_FOUND
    )
  }

  return toAssetListItemFromTodo(updated)
}

export async function updateWorkspaceNote(input: {
  userId: string
  assetId: string
  text: string
}): Promise<AssetListItem> {
  const updated = await updateNote({
    userId: input.userId,
    noteId: input.assetId,
    text: input.text,
  })

  if (!updated) {
    throw new WorkspaceModuleError(
      '没有找到这条笔记，或你没有权限更新它。',
      WORKSPACE_MODULE_ERROR_CODES.ASSET_NOT_FOUND
    )
  }

  await deleteEmbeddingsForAsset({ assetType: 'note', assetId: updated.id })
  return toAssetListItemFromNote(updated)
}

export async function updateWorkspaceTodo(input: {
  userId: string
  assetId: string
  text: string
  timeText?: string | null
  dueAt?: Date | null
}): Promise<AssetListItem> {
  const updated = await updateTodo({
    userId: input.userId,
    todoId: input.assetId,
    text: input.text,
    timeText: input.timeText,
    dueAt: input.dueAt,
  })

  if (!updated) {
    throw new WorkspaceModuleError(
      '没有找到这条待办，或你没有权限更新它。',
      WORKSPACE_MODULE_ERROR_CODES.ASSET_NOT_FOUND
    )
  }

  await deleteEmbeddingsForAsset({ assetType: 'todo', assetId: updated.id })
  return toAssetListItemFromTodo(updated)
}

export async function updateWorkspaceBookmark(input: {
  userId: string
  assetId: string
  text: string
  url: string
}): Promise<AssetListItem> {
  const updated = await updateBookmark({
    userId: input.userId,
    bookmarkId: input.assetId,
    text: input.text,
    url: input.url,
  })

  if (!updated) {
    throw new WorkspaceModuleError(
      '没有找到这条书签，或你没有权限更新它。',
      WORKSPACE_MODULE_ERROR_CODES.ASSET_NOT_FOUND
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

export async function archiveWorkspaceAsset(input: {
  userId: string
  assetId: string
  assetType: string
}): Promise<AssetListItem> {
  assertAssetType(input.assetType)
  const existing = requireExistingAsset(
    await getWorkspaceAssetByType({
      userId: input.userId,
      assetId: input.assetId,
      assetType: input.assetType,
    })
  )

  if (!canArchive(existing.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE)) {
    throw new WorkspaceModuleError(
      '当前状态不允许归档。',
      WORKSPACE_MODULE_ERROR_CODES.INVALID_LIFECYCLE_TRANSITION
    )
  }

  if (input.assetType === 'note') {
    const updated = await archiveNote({ userId: input.userId, noteId: input.assetId })
    return requireExistingAsset(updated ? toAssetListItemFromNote(updated) : null)
  }

  if (input.assetType === 'todo') {
    const updated = await archiveTodo({ userId: input.userId, todoId: input.assetId })
    return requireExistingAsset(updated ? toAssetListItemFromTodo(updated) : null)
  }

  const updated = await archiveBookmark({ userId: input.userId, bookmarkId: input.assetId })
  return requireExistingAsset(updated ? toAssetListItemFromBookmark(updated) : null)
}

export async function unarchiveWorkspaceAsset(input: {
  userId: string
  assetId: string
  assetType: string
}): Promise<AssetListItem> {
  assertAssetType(input.assetType)
  const existing = requireExistingAsset(
    await getWorkspaceAssetByType({
      userId: input.userId,
      assetId: input.assetId,
      assetType: input.assetType,
    })
  )

  if (!canUnarchive(existing.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE)) {
    throw new WorkspaceModuleError(
      '当前状态不允许取消归档。',
      WORKSPACE_MODULE_ERROR_CODES.INVALID_LIFECYCLE_TRANSITION
    )
  }

  if (input.assetType === 'note') {
    const updated = await unarchiveNote({ userId: input.userId, noteId: input.assetId })
    return requireExistingAsset(updated ? toAssetListItemFromNote(updated) : null)
  }

  if (input.assetType === 'todo') {
    const updated = await unarchiveTodo({ userId: input.userId, todoId: input.assetId })
    return requireExistingAsset(updated ? toAssetListItemFromTodo(updated) : null)
  }

  const updated = await unarchiveBookmark({ userId: input.userId, bookmarkId: input.assetId })
  return requireExistingAsset(updated ? toAssetListItemFromBookmark(updated) : null)
}

export async function moveWorkspaceAssetToTrash(input: {
  userId: string
  assetId: string
  assetType: string
}): Promise<AssetListItem> {
  assertAssetType(input.assetType)
  const existing = requireExistingAsset(
    await getWorkspaceAssetByType({
      userId: input.userId,
      assetId: input.assetId,
      assetType: input.assetType,
    })
  )

  if (!canMoveToTrash(existing.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE)) {
    throw new WorkspaceModuleError(
      '当前状态不允许移动到回收站。',
      WORKSPACE_MODULE_ERROR_CODES.INVALID_LIFECYCLE_TRANSITION
    )
  }

  if (input.assetType === 'note') {
    const updated = await moveNoteToTrash({ userId: input.userId, noteId: input.assetId })
    return requireExistingAsset(updated ? toAssetListItemFromNote(updated) : null)
  }

  if (input.assetType === 'todo') {
    const updated = await moveTodoToTrash({ userId: input.userId, todoId: input.assetId })
    return requireExistingAsset(updated ? toAssetListItemFromTodo(updated) : null)
  }

  const updated = await moveBookmarkToTrash({ userId: input.userId, bookmarkId: input.assetId })
  return requireExistingAsset(updated ? toAssetListItemFromBookmark(updated) : null)
}

export async function restoreWorkspaceAssetFromTrash(input: {
  userId: string
  assetId: string
  assetType: string
}): Promise<AssetListItem> {
  assertAssetType(input.assetType)
  const existing = requireExistingAsset(
    await getWorkspaceAssetByType({
      userId: input.userId,
      assetId: input.assetId,
      assetType: input.assetType,
    })
  )

  if (!canRestoreFromTrash(existing.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE)) {
    throw new WorkspaceModuleError(
      '当前状态不允许恢复。',
      WORKSPACE_MODULE_ERROR_CODES.INVALID_LIFECYCLE_TRANSITION
    )
  }

  if (input.assetType === 'note') {
    const updated = await restoreNoteFromTrash({ userId: input.userId, noteId: input.assetId })
    return requireExistingAsset(updated ? toAssetListItemFromNote(updated) : null)
  }

  if (input.assetType === 'todo') {
    const updated = await restoreTodoFromTrash({ userId: input.userId, todoId: input.assetId })
    return requireExistingAsset(updated ? toAssetListItemFromTodo(updated) : null)
  }

  const updated = await restoreBookmarkFromTrash({ userId: input.userId, bookmarkId: input.assetId })
  return requireExistingAsset(updated ? toAssetListItemFromBookmark(updated) : null)
}

export async function purgeWorkspaceAsset(input: {
  userId: string
  assetId: string
  assetType: string
}): Promise<LifecycleMutatedAsset> {
  assertAssetType(input.assetType)
  const existing = requireExistingAsset(
    await getWorkspaceAssetByType({
      userId: input.userId,
      assetId: input.assetId,
      assetType: input.assetType,
    })
  )

  if (!canPurge(existing.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE)) {
    throw new WorkspaceModuleError(
      '永久删除只允许在回收站中执行。',
      WORKSPACE_MODULE_ERROR_CODES.PURGE_REQUIRES_TRASHED_ASSET
    )
  }

  let deleted = false
  if (input.assetType === 'note') {
    deleted = await purgeNote({ userId: input.userId, noteId: input.assetId })
  } else if (input.assetType === 'todo') {
    deleted = await purgeTodo({ userId: input.userId, todoId: input.assetId })
  } else {
    deleted = await purgeBookmark({ userId: input.userId, bookmarkId: input.assetId })
  }

  if (!deleted) {
    throw new WorkspaceModuleError(
      '没有找到这条资产，或你没有权限操作它。',
      WORKSPACE_MODULE_ERROR_CODES.ASSET_NOT_FOUND
    )
  }

  return { id: input.assetId, type: input.assetType }
}

type AssetType = 'note' | 'link' | 'todo'

const ALL_LIFECYCLE_STATUSES: AssetLifecycleStatus[] = [
  ASSET_LIFECYCLE_STATUS.ACTIVE,
  ASSET_LIFECYCLE_STATUS.ARCHIVED,
  ASSET_LIFECYCLE_STATUS.TRASHED,
]

type LifecycleMutatedAsset = {
  id: string
  type: AssetType
}

type WorkspaceAssetType = AssetType

function assertAssetType(type: string): asserts type is WorkspaceAssetType {
  if (type !== 'note' && type !== 'todo' && type !== 'link') {
    throw new WorkspaceModuleError(
      '不支持的资产类型。',
      WORKSPACE_MODULE_ERROR_CODES.INVALID_ASSET_TYPE
    )
  }
}

async function getWorkspaceAssetByType(input: {
  userId: string
  assetId: string
  assetType: WorkspaceAssetType
}): Promise<AssetListItem | null> {
  if (input.assetType === 'note') {
    const note = await getNoteById(input.assetId, input.userId, {
      includeLifecycleStatuses: ALL_LIFECYCLE_STATUSES,
    })
    return note ? toAssetListItemFromNote(note) : null
  }

  if (input.assetType === 'todo') {
    const todo = await getTodoById(input.assetId, input.userId, {
      includeLifecycleStatuses: ALL_LIFECYCLE_STATUSES,
    })
    return todo ? toAssetListItemFromTodo(todo) : null
  }

  const bookmark = await getBookmarkById(input.assetId, input.userId, {
    includeLifecycleStatuses: ALL_LIFECYCLE_STATUSES,
  })
  return bookmark ? toAssetListItemFromBookmark(bookmark) : null
}

function requireExistingAsset(asset: AssetListItem | null): AssetListItem {
  if (!asset) {
    throw new WorkspaceModuleError(
      '没有找到这条资产，或你没有权限操作它。',
      WORKSPACE_MODULE_ERROR_CODES.ASSET_NOT_FOUND
    )
  }

  return asset
}

export async function listWorkspaceAssets(input: {
  userId: string
  type?: AssetType
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

  const items: AssetListItem[] = [
    ...notes.map(toAssetListItemFromNote),
    ...bookmarks.map(toAssetListItemFromBookmark),
    ...todos.map(toAssetListItemFromTodo),
  ]

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return items.slice(0, limit)
}

export async function listWorkspaceLinkAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  const bookmarks = await listBookmarks({
    userId,
    limit: limit ?? 50,
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
  })
  return bookmarks.map(toAssetListItemFromBookmark)
}

export async function listWorkspaceNoteAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  const notes = await listNotes({
    userId,
    limit: limit ?? 50,
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
  })
  return notes.map(toAssetListItemFromNote)
}

export async function listWorkspaceRecentAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  return listWorkspaceAssets({ userId, limit: limit ?? 6 })
}

export async function listWorkspaceTodoAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  const todos = await listTodos({
    userId,
    limit: limit ?? 50,
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
  })
  return todos.map(toAssetListItemFromTodo)
}

export async function listWorkspaceArchivedAssets(input: {
  userId: string
  type?: AssetType
  limit?: number
}): Promise<AssetListItem[]> {
  return listWorkspaceAssets({
    userId: input.userId,
    type: input.type,
    limit: input.limit,
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ARCHIVED,
  })
}

export async function listWorkspaceTrashedAssets(input: {
  userId: string
  type?: AssetType
  limit?: number
}): Promise<AssetListItem[]> {
  return listWorkspaceAssets({
    userId: input.userId,
    type: input.type,
    limit: input.limit,
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.TRASHED,
  })
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
