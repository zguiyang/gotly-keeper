import 'server-only'

import { createNote, listNotes, toNoteListItem, type NoteListItem } from '@/server/services/notes'
import { createTodo, listTodos, setTodoCompletion, toTodoListItem, type TodoListItem } from '@/server/services/todos'
import { createBookmark, listBookmarks, toBookmarkListItem, type BookmarkListItem } from '@/server/services/bookmarks'

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
    createdAt: note.createdAt,
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
    createdAt: todo.createdAt,
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
    createdAt: bookmark.createdAt,
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

type AssetType = 'note' | 'link' | 'todo'

export async function listWorkspaceAssets(input: {
  userId: string
  type?: AssetType
  limit?: number
}): Promise<AssetListItem[]> {
  const limit = input.limit ?? 50

  if (input.type === 'note') {
    const notes = await listNotes({ userId: input.userId, limit })
    return notes.map(toAssetListItemFromNote)
  }

  if (input.type === 'link') {
    const bookmarks = await listBookmarks({ userId: input.userId, limit })
    return bookmarks.map(toAssetListItemFromBookmark)
  }

  if (input.type === 'todo') {
    const todos = await listTodos({ userId: input.userId, limit })
    return todos.map(toAssetListItemFromTodo)
  }

  const [notes, bookmarks, todos] = await Promise.all([
    listNotes({ userId: input.userId, limit }),
    listBookmarks({ userId: input.userId, limit }),
    listTodos({ userId: input.userId, limit }),
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
  const bookmarks = await listBookmarks({ userId, limit: limit ?? 50 })
  return bookmarks.map(toAssetListItemFromBookmark)
}

export async function listWorkspaceNoteAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  const notes = await listNotes({ userId, limit: limit ?? 50 })
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
  const todos = await listTodos({ userId, limit: limit ?? 50 })
  return todos.map(toAssetListItemFromTodo)
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
