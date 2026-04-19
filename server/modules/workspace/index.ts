import 'server-only'

import { parsedCommandSchema, type ParsedCommand } from '@/server/lib/ai/ai-schema'
import { parseWorkspaceCommand } from '@/server/lib/ai/workspace-parser'
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
import { searchAssets } from '@/server/services/search/assets-search.service'
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
import { toWorkspaceRunResult } from './workspace-run-result'


import type {
  AssetListItem,
  BookmarkSummaryResult,
  NoteSummaryResult,
  TodoReviewResult,
  WorkspaceAssetActionResult,
} from '@/shared/assets/assets.types'
import type {
  WorkspaceRunRequest,
  WorkspaceRunResult,
} from '@/shared/workspace/workspace-run.types'

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
const SEARCH_KEYWORDS = ['找', '查', '搜索', '搜', '在哪', '哪里', '回忆', '看看']
const SUMMARY_KEYWORDS = ['总结', '汇总', '复盘', '梳理', '归纳', '回顾']
const NOTE_KEYWORDS = ['笔记', '想法', '备忘', '灵感', '记录']
const BOOKMARK_KEYWORDS = ['收藏', '书签', '链接', '网址', '文章', '网页', 'url']
const TODO_TARGET_KEYWORDS = ['待办', 'todo', '任务', '未完成']
const TIME_HINT_REGEX = /(今天|明天|后天|昨天|今晚|明早|下午|晚上|本周|上周|下周|最近|周[一二三四五六日天]|\d{1,2}点)/

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

function detectTimeHint(text: string): string | null {
  return text.match(TIME_HINT_REGEX)?.[0] ?? null
}

function hasSearchIntent(text: string): boolean {
  return SEARCH_KEYWORDS.some((kw) => text.includes(kw)) || text.includes('?') || text.includes('？')
}

function hasSummaryIntent(text: string): boolean {
  return SUMMARY_KEYWORDS.some((kw) => text.includes(kw))
}

function detectSearchTypeHint(text: string): 'todo' | 'note' | 'link' | null {
  if (BOOKMARK_KEYWORDS.some((kw) => text.includes(kw))) {
    return 'link'
  }

  if (TODO_TARGET_KEYWORDS.some((kw) => text.includes(kw))) {
    return 'todo'
  }

  if (NOTE_KEYWORDS.some((kw) => text.includes(kw))) {
    return 'note'
  }

  return null
}

function detectSummaryTarget(text: string): 'todos' | 'notes' | 'bookmarks' | null {
  if (TODO_TARGET_KEYWORDS.some((kw) => text.includes(kw))) {
    return 'todos'
  }

  if (BOOKMARK_KEYWORDS.some((kw) => text.includes(kw))) {
    return 'bookmarks'
  }

  if (NOTE_KEYWORDS.some((kw) => text.includes(kw))) {
    return 'notes'
  }

  return null
}

function resolveSummaryTarget(command: ParsedCommand): 'todos' | 'notes' | 'bookmarks' {
  return command.summary?.target ?? detectSummaryTarget(command.originalText) ?? 'notes'
}

function resolveCommandQuery(command: ParsedCommand): string {
  return command.search?.query ?? command.summary?.query ?? command.originalText
}

function describeWorkspaceSearch(input: {
  typeHint?: 'todo' | 'note' | 'link' | null
  timeHint?: string | null
  completionHint?: 'complete' | 'incomplete' | null
}): string {
  const typeLabel =
    input.typeHint === 'todo'
      ? '待办'
      : input.typeHint === 'note'
        ? '笔记'
        : input.typeHint === 'link'
          ? '书签'
          : '全部内容'

  const qualifiers: string[] = []

  if (input.completionHint === 'incomplete') {
    qualifiers.push('未完成')
  } else if (input.completionHint === 'complete') {
    qualifiers.push('已完成')
  }

  if (input.timeHint) {
    qualifiers.push(input.timeHint)
  }

  return qualifiers.length > 0 ? `${typeLabel} · ${qualifiers.join(' · ')}` : typeLabel
}

function resolveSummaryQuery(command: ParsedCommand): string | null {
  return command.summary?.query ?? null
}

function resolveCommandLinkUrl(command: ParsedCommand): string {
  const structuredUrl = command.bookmark?.url?.trim()

  if (structuredUrl) {
    return structuredUrl
  }

  const fallbackUrl = extractUrl(command.rawInput ?? command.originalText)

  if (fallbackUrl) {
    return fallbackUrl
  }

  throw new WorkspaceModuleError('缺少可保存的链接地址。')
}

function buildHeuristicWorkspaceCommand(text: string): ParsedCommand {
  const trimmedText = text.trim()

  if (hasSummaryIntent(trimmedText)) {
    return parsedCommandSchema.parse({
      confidence: 0,
      originalText: trimmedText,
      rawInput: trimmedText,
      intent: 'summarize',
      operation: 'summarize_workspace',
      assetType: null,
      todo: null,
      note: null,
      bookmark: null,
      search: null,
      summary: {
        target: detectSummaryTarget(trimmedText),
        query: trimmedText,
      },
    })
  }

  if (hasSearchIntent(trimmedText)) {
    return parsedCommandSchema.parse({
      confidence: 0,
      originalText: trimmedText,
      rawInput: trimmedText,
      intent: 'search',
      operation: 'search_assets',
      assetType: null,
      todo: null,
      note: null,
      bookmark: null,
      search: {
        query: trimmedText,
        typeHint: detectSearchTypeHint(trimmedText),
        timeHint: detectTimeHint(trimmedText),
        completionHint: null,
      },
      summary: null,
    })
  }

  const classification = classifyAssetInput(trimmedText)

  if (classification.kind === 'link') {
    return parsedCommandSchema.parse({
      confidence: 0,
      originalText: trimmedText,
      rawInput: trimmedText,
      intent: 'create',
      operation: 'create_link',
      assetType: 'link',
      todo: null,
      note: null,
      bookmark: {
        url: classification.url,
        title: null,
        note: null,
        summary: null,
      },
      search: null,
      summary: null,
    })
  }

  if (classification.kind === 'todo') {
    return parsedCommandSchema.parse({
      confidence: 0,
      originalText: trimmedText,
      rawInput: trimmedText,
      intent: 'create',
      operation: 'create_todo',
      assetType: 'todo',
      todo: {
        title: trimmedText,
        content: null,
        timeText: detectTimeHint(trimmedText),
        dueAtIso: null,
      },
      note: null,
      bookmark: null,
      search: null,
      summary: null,
    })
  }

  return parsedCommandSchema.parse({
    confidence: 0,
    originalText: trimmedText,
    rawInput: trimmedText,
    intent: 'create',
    operation: 'create_note',
    assetType: 'note',
    todo: null,
    note: {
      title: null,
      content: trimmedText,
      summary: null,
    },
    bookmark: null,
    search: null,
    summary: null,
  })
}

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

export async function createWorkspaceNote(input: {
  userId: string
  text?: string
  rawInput?: string
  title?: string | null
  content?: string | null
  summary?: string | null
}): Promise<WorkspaceAssetActionResult> {
  const note = await createNote({
    userId: input.userId,
    ...(input.rawInput !== undefined
      ? {
          rawInput: input.rawInput,
          title: input.title,
          content: input.content,
          summary: input.summary,
        }
      : { text: input.text ?? '' }),
  })

  return { kind: 'created', asset: toAssetListItemFromNote(note) }
}

export async function createWorkspaceTodo(input: {
  userId: string
  text?: string
  rawInput?: string
  title?: string | null
  content?: string | null
  timeText?: string | null
  dueAt?: Date | null
}): Promise<WorkspaceAssetActionResult> {
  const todo = await createTodo({
    userId: input.userId,
    ...(input.rawInput !== undefined
      ? {
          rawInput: input.rawInput,
          title: input.title,
          content: input.content,
          timeText: input.timeText,
          dueAt: input.dueAt,
        }
      : { text: input.text ?? '' }),
  })

  return { kind: 'created', asset: toAssetListItemFromTodo(todo) }
}

export async function createWorkspaceLink(input: {
  userId: string
  text?: string
  rawInput?: string
  url: string
  title?: string | null
  note?: string | null
  summary?: string | null
}): Promise<WorkspaceAssetActionResult> {
  const bookmark = await createBookmark({
    userId: input.userId,
    ...(input.rawInput !== undefined
      ? {
          rawInput: input.rawInput,
          title: input.title,
          note: input.note,
          summary: input.summary,
        }
      : { text: input.text ?? '' }),
    url: input.url,
  })

  const asset = toAssetListItemFromBookmark(bookmark)
  asset.bookmarkMeta = buildPendingBookmarkMetaForResponse()

  void scheduleBookmarkEnrichTask({
    bookmarkId: asset.id,
    userId: input.userId,
    url: input.url,
  })

  return { kind: 'created', asset }
}

export async function createWorkspaceAsset(input: {
  userId: string
  text: string
}): Promise<WorkspaceAssetActionResult> {
  const classification = classifyAssetInput(input.text)

  if (classification.kind === 'link') {
    return createWorkspaceLink({
      userId: input.userId,
      text: input.text,
      url: classification.url,
    })
  }

  if (classification.kind === 'todo') {
    return createWorkspaceTodo({
      userId: input.userId,
      text: input.text,
    })
  }

  return createWorkspaceNote({
    userId: input.userId,
    text: input.text,
  })
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
  text?: string
  rawInput?: string
  title?: string | null
  content?: string | null
  summary?: string | null
}): Promise<AssetListItem> {
  const updated = await updateNote(
    input.rawInput !== undefined
      ? {
          userId: input.userId,
          noteId: input.assetId,
          rawInput: input.rawInput,
          title: input.title,
          content: input.content,
          summary: input.summary,
        }
      : {
          userId: input.userId,
          noteId: input.assetId,
          text: input.text ?? '',
        }
  )

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
  text?: string
  rawInput?: string
  title?: string | null
  content?: string | null
  timeText?: string | null
  dueAt?: Date | null
}): Promise<AssetListItem> {
  const updated = await updateTodo({
    userId: input.userId,
    todoId: input.assetId,
    text: input.text,
    rawInput: input.rawInput,
    title: input.title,
    content: input.content,
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
  text?: string
  rawInput?: string
  url: string
  title?: string | null
  note?: string | null
  summary?: string | null
}): Promise<AssetListItem> {
  const updated = await updateBookmark(
    input.rawInput !== undefined
      ? {
          userId: input.userId,
          bookmarkId: input.assetId,
          rawInput: input.rawInput,
          url: input.url,
          title: input.title,
          note: input.note,
          summary: input.summary,
        }
      : {
          userId: input.userId,
          bookmarkId: input.assetId,
          text: input.text ?? '',
          url: input.url,
        }
  )

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
  query?: string | null
}): Promise<TodoReviewResult> {
  return reviewWorkspaceUnfinishedTodosInternal(input.userId, input.query ?? null)
}

export async function summarizeWorkspaceRecentNotes(input: {
  userId: string
  query?: string | null
}): Promise<NoteSummaryResult> {
  return summarizeWorkspaceRecentNotesInternal(input.userId, input.query ?? null)
}

export async function summarizeWorkspaceRecentBookmarks(input: {
  userId: string
  query?: string | null
}): Promise<BookmarkSummaryResult> {
  return summarizeWorkspaceRecentBookmarksInternal(input.userId, input.query ?? null)
}

export async function searchWorkspaceAssets(input: {
  userId: string
  query: string
  typeHint?: 'todo' | 'note' | 'link' | null
  timeHint?: string | null
  completionHint?: 'complete' | 'incomplete' | null
}): Promise<AssetListItem[]> {
  return searchAssets({
    userId: input.userId,
    query: input.query,
    typeHint: input.typeHint ?? null,
    timeHint: input.timeHint ?? null,
    completionHint: input.completionHint ?? null,
  })
}

export async function resolveWorkspaceCommand(input: {
  text: string
}): Promise<ParsedCommand> {
  try {
    return await parseWorkspaceCommand(input.text)
  } catch {
    return buildHeuristicWorkspaceCommand(input.text)
  }
}

export function buildQuickActionWorkspaceCommand(
  action: Extract<WorkspaceRunRequest, { kind: 'quick-action' }>['action']
): ParsedCommand {
  const target =
    action === 'review-todos'
      ? 'todos'
      : action === 'summarize-notes'
        ? 'notes'
        : 'bookmarks'

  return parsedCommandSchema.parse({
    confidence: 1,
    originalText: action,
    rawInput: action,
    intent: 'summarize',
    operation: 'summarize_workspace',
    assetType: null,
    todo: null,
    note: null,
    bookmark: null,
    search: null,
    summary: {
      target,
      query: null,
    },
  })
}

export async function executeWorkspaceCommand(input: {
  userId: string
  command: ParsedCommand
}): Promise<WorkspaceRunResult> {
  const { command, userId } = input

  if (command.operation === 'create_note') {
    return toWorkspaceRunResult(
      await createWorkspaceNote({
        userId,
        rawInput: command.rawInput ?? command.originalText,
        title: command.note?.title ?? null,
        content: command.note?.content ?? command.originalText,
        summary: command.note?.summary ?? null,
      })
    )
  }

  if (command.operation === 'create_todo') {
    return toWorkspaceRunResult(
      await createWorkspaceTodo({
        userId,
        rawInput: command.rawInput ?? command.originalText,
        title: command.todo?.title ?? command.originalText,
        content: command.todo?.content ?? null,
        timeText: command.todo?.timeText ?? null,
        dueAt: command.todo?.dueAtIso ? new Date(command.todo.dueAtIso) : null,
      })
    )
  }

  if (command.operation === 'create_link') {
    return toWorkspaceRunResult(
      await createWorkspaceLink({
        userId,
        rawInput: command.rawInput ?? command.originalText,
        url: resolveCommandLinkUrl(command),
        title: command.bookmark?.title ?? null,
        note: command.bookmark?.note ?? null,
        summary: command.bookmark?.summary ?? null,
      })
    )
  }

  if (command.operation === 'search_assets') {
    const query = resolveCommandQuery(command)
    const results = await searchWorkspaceAssets({
      userId,
      query,
      typeHint: command.search?.typeHint ?? null,
      timeHint: command.search?.timeHint ?? null,
      completionHint: command.search?.completionHint ?? null,
    })

    return {
      kind: 'query',
      query,
      queryDescription: describeWorkspaceSearch({
        typeHint: command.search?.typeHint ?? null,
        timeHint: command.search?.timeHint ?? null,
        completionHint: command.search?.completionHint ?? null,
      }),
      results,
    }
  }

  const query = resolveSummaryQuery(command)
  const target = resolveSummaryTarget(command)

  if (target === 'todos') {
    return {
      kind: 'todo-review',
      review: await reviewWorkspaceUnfinishedTodos({
        userId,
        query,
      }),
    }
  }

  if (target === 'notes') {
    return {
      kind: 'note-summary',
      summary: await summarizeWorkspaceRecentNotes({
        userId,
        query,
      }),
    }
  }

  return {
    kind: 'bookmark-summary',
    summary: await summarizeWorkspaceRecentBookmarks({
      userId,
      query,
    }),
  }
}

export async function runWorkspaceCommand(input: {
  userId: string
  text: string
}): Promise<{
  command: ParsedCommand
  result: WorkspaceRunResult
}> {
  const command = await resolveWorkspaceCommand({ text: input.text })
  const result = await executeWorkspaceCommand({
    userId: input.userId,
    command,
  })

  return {
    command,
    result,
  }
}
