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
  getBookmarkById,
  listBookmarksPage,
  moveBookmarkToTrash,
  purgeBookmark,
  restoreBookmarkFromTrash,
  unarchiveBookmark,
} from '@/server/services/bookmarks'
import {
  archiveNote,
  getNoteById,
  listNotesPage,
  moveNoteToTrash,
  purgeNote,
  restoreNoteFromTrash,
  unarchiveNote,
} from '@/server/services/notes'
import {
  archiveTodo,
  getTodoById,
  listCompletedTodos,
  listOverdueTodos,
  listTodoDateMarkers,
  listTodosByDueDate,
  listTodosPage,
  listUnscheduledTodos,
  moveTodoToTrash,
  purgeTodo,
  restoreTodoFromTrash,
  unarchiveTodo,
} from '@/server/services/todos'
import {
  toAssetListItemFromBookmark,
  toAssetListItemFromNote,
  toAssetListItemFromTodo,
} from '@/server/services/workspace/asset-list-item'
import {
  createWorkspaceLinkAsset,
  createWorkspaceNoteAsset,
  createWorkspaceTodoAsset,
  listWorkspaceAssets as listWorkspaceAssetsService,
  searchWorkspaceAssets as searchWorkspaceAssetsService,
  updateWorkspaceLinkAsset,
  updateWorkspaceNoteAsset,
  setWorkspaceTodoAssetCompletion,
  updateWorkspaceTodoAsset,
  WorkspaceAssetsError,
} from '@/server/services/workspace/workspace-assets.service'
import {
  type AssetLifecycleStatus,
  ASSET_LIFECYCLE_STATUS,
} from '@/shared/assets/asset-lifecycle.types'

import { summarizeWorkspaceRecentBookmarksInternal } from './bookmarks.summary'
import {
  createMixedWorkspaceAssetsPage,
  decodeMixedWorkspaceAssetsCursor,
} from './mixed-assets-pagination'
import { summarizeWorkspaceRecentNotesInternal } from './notes.summary'
import { reviewWorkspaceUnfinishedTodosInternal } from './todos.review'

import type {
  AssetListItem,
  BookmarkSummaryResult,
  NoteSummaryResult,
  TodoReviewResult,
  WorkspaceAssetActionResult,
} from '@/shared/assets/assets.types'
import type { PaginatedResult } from '@/shared/pagination'
import type { WorkspaceAgentTimeFilter } from '@/shared/workspace/workspace-run.types'

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

export async function createWorkspaceNote(input: {
  userId: string
  rawInput: string
  title?: string | null
  content?: string | null
  summary?: string | null
}): Promise<Extract<WorkspaceAssetActionResult, { kind: 'created' }>> {
  const asset = await createWorkspaceNoteAsset({
    userId: input.userId,
    rawInput: input.rawInput,
    title: input.title ?? null,
    content: input.content ?? null,
    summary: input.summary ?? null,
  })

  return { kind: 'created', asset }
}

export async function createWorkspaceTodo(input: {
  userId: string
  rawInput: string
  title?: string | null
  content?: string | null
  timeText?: string | null
  dueAt?: Date | null
}): Promise<Extract<WorkspaceAssetActionResult, { kind: 'created' }>> {
  const asset = await createWorkspaceTodoAsset({
    userId: input.userId,
    rawInput: input.rawInput,
    title: input.title ?? null,
    content: input.content ?? null,
    timeText: input.timeText ?? null,
    dueAt: input.dueAt ?? null,
  })

  return { kind: 'created', asset }
}

export async function createWorkspaceLink(input: {
  userId: string
  rawInput: string
  url: string
  title?: string | null
  note?: string | null
  summary?: string | null
}): Promise<Extract<WorkspaceAssetActionResult, { kind: 'created' }>> {
  const asset = await createWorkspaceLinkAsset({
    userId: input.userId,
    rawInput: input.rawInput,
    url: input.url,
    title: input.title ?? null,
    note: input.note ?? null,
    summary: input.summary ?? null,
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
      rawInput: input.text,
      url: classification.url,
    })
  }

  if (classification.kind === 'todo') {
    return createWorkspaceTodo({
      userId: input.userId,
      rawInput: input.text,
    })
  }

  return createWorkspaceNote({
    userId: input.userId,
    rawInput: input.text,
  })
}

export async function setWorkspaceTodoCompletion(input: {
  userId: string
  assetId: string
  completed: boolean
}): Promise<AssetListItem> {
  return runWorkspaceAssetMutation(() => setWorkspaceTodoAssetCompletion(input))
}

export async function updateWorkspaceNote(input: {
  userId: string
  assetId: string
  rawInput: string
  title?: string | null
  content?: string | null
  summary?: string | null
}): Promise<AssetListItem> {
  return runWorkspaceAssetMutation(() =>
    updateWorkspaceNoteAsset({
      userId: input.userId,
      assetId: input.assetId,
      rawInput: input.rawInput,
      title: input.title,
      content: input.content,
      summary: input.summary,
    })
  )
}

export async function updateWorkspaceTodo(input: {
  userId: string
  assetId: string
  rawInput: string
  title?: string | null
  content?: string | null
  timeText?: string | null
  dueAt?: Date | null
}): Promise<AssetListItem> {
  return runWorkspaceAssetMutation(() =>
    updateWorkspaceTodoAsset({
      userId: input.userId,
      assetId: input.assetId,
      rawInput: input.rawInput,
      title: input.title ?? null,
      content: input.content ?? null,
      timeText: input.timeText ?? null,
      dueAt: input.dueAt ?? null,
    })
  )
}

export async function updateWorkspaceBookmark(input: {
  userId: string
  assetId: string
  rawInput: string
  url: string
  title?: string | null
  note?: string | null
  summary?: string | null
}): Promise<AssetListItem> {
  return runWorkspaceAssetMutation(() =>
    updateWorkspaceLinkAsset({
      userId: input.userId,
      assetId: input.assetId,
      rawInput: input.rawInput,
      url: input.url,
      title: input.title,
      note: input.note,
      summary: input.summary,
    })
  )
}

export async function archiveWorkspaceAsset(input: {
  userId: string
  assetId: string
  assetType: string
}): Promise<AssetListItem> {
  assertAssetType(input.assetType)
  return mutateWorkspaceAssetLifecycle({
    userId: input.userId,
    assetId: input.assetId,
    assetType: input.assetType,
    canTransition: canArchive,
    invalidMessage: '当前状态不允许归档。',
    invalidCode: WORKSPACE_MODULE_ERROR_CODES.INVALID_LIFECYCLE_TRANSITION,
    run: (adapter) => adapter.archive(input.assetId, input.userId),
  })
}

export async function unarchiveWorkspaceAsset(input: {
  userId: string
  assetId: string
  assetType: string
}): Promise<AssetListItem> {
  assertAssetType(input.assetType)
  return mutateWorkspaceAssetLifecycle({
    userId: input.userId,
    assetId: input.assetId,
    assetType: input.assetType,
    canTransition: canUnarchive,
    invalidMessage: '当前状态不允许取消归档。',
    invalidCode: WORKSPACE_MODULE_ERROR_CODES.INVALID_LIFECYCLE_TRANSITION,
    run: (adapter) => adapter.unarchive(input.assetId, input.userId),
  })
}

export async function moveWorkspaceAssetToTrash(input: {
  userId: string
  assetId: string
  assetType: string
}): Promise<AssetListItem> {
  assertAssetType(input.assetType)
  return mutateWorkspaceAssetLifecycle({
    userId: input.userId,
    assetId: input.assetId,
    assetType: input.assetType,
    canTransition: canMoveToTrash,
    invalidMessage: '当前状态不允许移动到回收站。',
    invalidCode: WORKSPACE_MODULE_ERROR_CODES.INVALID_LIFECYCLE_TRANSITION,
    run: (adapter) => adapter.moveToTrash(input.assetId, input.userId),
  })
}

export async function restoreWorkspaceAssetFromTrash(input: {
  userId: string
  assetId: string
  assetType: string
}): Promise<AssetListItem> {
  assertAssetType(input.assetType)
  return mutateWorkspaceAssetLifecycle({
    userId: input.userId,
    assetId: input.assetId,
    assetType: input.assetType,
    canTransition: canRestoreFromTrash,
    invalidMessage: '当前状态不允许恢复。',
    invalidCode: WORKSPACE_MODULE_ERROR_CODES.INVALID_LIFECYCLE_TRANSITION,
    run: (adapter) => adapter.restoreFromTrash(input.assetId, input.userId),
  })
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

  const deleted = await getWorkspaceAssetAdapter(input.assetType).purge(input.assetId, input.userId)

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

type WorkspaceAssetAdapter = {
  getById: (assetId: string, userId: string) => Promise<AssetListItem | null>
  listPage: (input: {
    userId: string
    pageSize: number
    cursor?: string | null
    lifecycleStatus: AssetLifecycleStatus
  }) => Promise<PaginatedResult<AssetListItem>>
  archive: (assetId: string, userId: string) => Promise<AssetListItem | null>
  unarchive: (assetId: string, userId: string) => Promise<AssetListItem | null>
  moveToTrash: (assetId: string, userId: string) => Promise<AssetListItem | null>
  restoreFromTrash: (assetId: string, userId: string) => Promise<AssetListItem | null>
  purge: (assetId: string, userId: string) => Promise<boolean>
}

type WorkspaceAssetAdapterConfig<TAsset> = {
  getById: (assetId: string, userId: string) => Promise<TAsset | null>
  listPage: (input: {
    userId: string
    pageSize: number
    cursor?: string | null
    lifecycleStatus: AssetLifecycleStatus
  }) => Promise<PaginatedResult<TAsset>>
  archive: (assetId: string, userId: string) => Promise<TAsset | null>
  unarchive: (assetId: string, userId: string) => Promise<TAsset | null>
  moveToTrash: (assetId: string, userId: string) => Promise<TAsset | null>
  restoreFromTrash: (assetId: string, userId: string) => Promise<TAsset | null>
  purge: (assetId: string, userId: string) => Promise<boolean>
  mapAsset: (asset: TAsset) => AssetListItem
}

function mapWorkspaceAsset<TAsset>(
  asset: TAsset | null,
  mapAsset: (asset: TAsset) => AssetListItem
): AssetListItem | null {
  return asset ? mapAsset(asset) : null
}

function buildWorkspaceAssetAdapter<TAsset>(
  config: WorkspaceAssetAdapterConfig<TAsset>
): WorkspaceAssetAdapter {
  return {
    getById: async (assetId, userId) =>
      mapWorkspaceAsset(await config.getById(assetId, userId), config.mapAsset),
    listPage: async ({ userId, pageSize, cursor, lifecycleStatus }) => {
      const page = await config.listPage({
        userId,
        pageSize,
        cursor,
        lifecycleStatus,
      })
      return {
        items: page.items.map(config.mapAsset),
        pageInfo: page.pageInfo,
      }
    },
    archive: async (assetId, userId) =>
      mapWorkspaceAsset(await config.archive(assetId, userId), config.mapAsset),
    unarchive: async (assetId, userId) =>
      mapWorkspaceAsset(await config.unarchive(assetId, userId), config.mapAsset),
    moveToTrash: async (assetId, userId) =>
      mapWorkspaceAsset(await config.moveToTrash(assetId, userId), config.mapAsset),
    restoreFromTrash: async (assetId, userId) =>
      mapWorkspaceAsset(await config.restoreFromTrash(assetId, userId), config.mapAsset),
    purge: config.purge,
  }
}

function assertAssetType(type: string): asserts type is WorkspaceAssetType {
  if (type !== 'note' && type !== 'todo' && type !== 'link') {
    throw new WorkspaceModuleError(
      '不支持的资产类型。',
      WORKSPACE_MODULE_ERROR_CODES.INVALID_ASSET_TYPE
    )
  }
}

function getWorkspaceAssetAdapter(assetType: WorkspaceAssetType): WorkspaceAssetAdapter {
  if (assetType === 'note') {
    return buildWorkspaceAssetAdapter({
      getById: async (assetId, userId) => {
        return getNoteById(assetId, userId, {
          includeLifecycleStatuses: ALL_LIFECYCLE_STATUSES,
        })
      },
      listPage: ({ userId, pageSize, cursor, lifecycleStatus }) =>
        listNotesPage({
          userId,
          pageSize,
          cursor,
          lifecycleStatus,
        }),
      archive: (assetId, userId) => archiveNote({ userId, noteId: assetId }),
      unarchive: (assetId, userId) => unarchiveNote({ userId, noteId: assetId }),
      moveToTrash: (assetId, userId) => moveNoteToTrash({ userId, noteId: assetId }),
      restoreFromTrash: (assetId, userId) => restoreNoteFromTrash({ userId, noteId: assetId }),
      purge: (assetId, userId) => purgeNote({ userId, noteId: assetId }),
      mapAsset: toAssetListItemFromNote,
    })
  }

  if (assetType === 'todo') {
    return buildWorkspaceAssetAdapter({
      getById: async (assetId, userId) => {
        return getTodoById(assetId, userId, {
          includeLifecycleStatuses: ALL_LIFECYCLE_STATUSES,
        })
      },
      listPage: ({ userId, pageSize, cursor, lifecycleStatus }) =>
        listTodosPage({
          userId,
          pageSize,
          cursor,
          lifecycleStatus,
        }),
      archive: (assetId, userId) => archiveTodo({ userId, todoId: assetId }),
      unarchive: (assetId, userId) => unarchiveTodo({ userId, todoId: assetId }),
      moveToTrash: (assetId, userId) => moveTodoToTrash({ userId, todoId: assetId }),
      restoreFromTrash: (assetId, userId) => restoreTodoFromTrash({ userId, todoId: assetId }),
      purge: (assetId, userId) => purgeTodo({ userId, todoId: assetId }),
      mapAsset: toAssetListItemFromTodo,
    })
  }

  return buildWorkspaceAssetAdapter({
    getById: async (assetId, userId) => {
      return getBookmarkById(assetId, userId, {
        includeLifecycleStatuses: ALL_LIFECYCLE_STATUSES,
      })
    },
    listPage: ({ userId, pageSize, cursor, lifecycleStatus }) =>
      listBookmarksPage({
        userId,
        pageSize,
        cursor,
        lifecycleStatus,
      }),
    archive: (assetId, userId) => archiveBookmark({ userId, bookmarkId: assetId }),
    unarchive: (assetId, userId) => unarchiveBookmark({ userId, bookmarkId: assetId }),
    moveToTrash: (assetId, userId) => moveBookmarkToTrash({ userId, bookmarkId: assetId }),
    restoreFromTrash: (assetId, userId) =>
      restoreBookmarkFromTrash({ userId, bookmarkId: assetId }),
    purge: (assetId, userId) => purgeBookmark({ userId, bookmarkId: assetId }),
    mapAsset: toAssetListItemFromBookmark,
  })
}

async function getWorkspaceAssetByType(input: {
  userId: string
  assetId: string
  assetType: WorkspaceAssetType
}): Promise<AssetListItem | null> {
  return getWorkspaceAssetAdapter(input.assetType).getById(input.assetId, input.userId)
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

async function runWorkspaceAssetMutation<TResult>(
  execute: () => Promise<TResult>
): Promise<TResult> {
  try {
    return await execute()
  } catch (error) {
    if (error instanceof WorkspaceAssetsError) {
      throw new WorkspaceModuleError(error.publicMessage, error.code)
    }

    throw error
  }
}

async function mutateWorkspaceAssetLifecycle(input: {
  userId: string
  assetId: string
  assetType: WorkspaceAssetType
  canTransition: (status: AssetLifecycleStatus) => boolean
  invalidMessage: string
  invalidCode: WorkspaceModuleErrorCode
  run: (adapter: WorkspaceAssetAdapter) => Promise<AssetListItem | null>
}): Promise<AssetListItem> {
  const existing = requireExistingAsset(
    await getWorkspaceAssetByType({
      userId: input.userId,
      assetId: input.assetId,
      assetType: input.assetType,
    })
  )

  if (!input.canTransition(existing.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE)) {
    throw new WorkspaceModuleError(input.invalidMessage, input.invalidCode)
  }

  return requireExistingAsset(
    await input.run(getWorkspaceAssetAdapter(input.assetType))
  )
}

export async function listWorkspaceAssets(input: {
  userId: string
  type?: AssetType
  limit?: number
  lifecycleStatus?: AssetLifecycleStatus
}): Promise<AssetListItem[]> {
  return listWorkspaceAssetsService(input)
}

export async function listWorkspaceAssetsPage(input: {
  userId: string
  type?: AssetType
  lifecycleStatus?: AssetLifecycleStatus
  pageSize?: number
  cursor?: string | null
}): Promise<PaginatedResult<AssetListItem>> {
  const pageSize = input.pageSize ?? 50
  const lifecycleStatus = input.lifecycleStatus ?? ASSET_LIFECYCLE_STATUS.ACTIVE

  if (input.type === 'note') {
    return getWorkspaceAssetAdapter('note').listPage({
      userId: input.userId,
      pageSize,
      cursor: input.cursor,
      lifecycleStatus,
    })
  }

  if (input.type === 'link') {
    return getWorkspaceAssetAdapter('link').listPage({
      userId: input.userId,
      pageSize,
      cursor: input.cursor,
      lifecycleStatus,
    })
  }

  if (input.type === 'todo') {
    return getWorkspaceAssetAdapter('todo').listPage({
      userId: input.userId,
      pageSize,
      cursor: input.cursor,
      lifecycleStatus,
    })
  }

  const mixedCursor = decodeMixedWorkspaceAssetsCursor(input.cursor)
  const [notesPage, bookmarksPage, todosPage] = await Promise.all([
    getWorkspaceAssetAdapter('note').listPage({
      userId: input.userId,
      pageSize,
      cursor: mixedCursor?.notesCursor ?? null,
      lifecycleStatus,
    }),
    getWorkspaceAssetAdapter('link').listPage({
      userId: input.userId,
      pageSize,
      cursor: mixedCursor?.bookmarksCursor ?? null,
      lifecycleStatus,
    }),
    getWorkspaceAssetAdapter('todo').listPage({
      userId: input.userId,
      pageSize,
      cursor: mixedCursor?.todosCursor ?? null,
      lifecycleStatus,
    }),
  ])

  return createMixedWorkspaceAssetsPage({
    pageSize,
    incomingCursor: mixedCursor,
    notesPage,
    bookmarksPage,
    todosPage,
  })
}

export async function listWorkspaceLinkAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  return listWorkspaceAssets({
    userId,
    limit: limit ?? 50,
    type: 'link',
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
  })
}

export async function listWorkspaceNoteAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  return listWorkspaceAssets({
    userId,
    limit: limit ?? 50,
    type: 'note',
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
  })
}

export async function listWorkspaceRecentAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  return listWorkspaceAssets({ userId, limit: limit ?? 10 })
}

export async function listWorkspaceTodoAssets(
  userId: string,
  limit?: number
): Promise<AssetListItem[]> {
  return listWorkspaceAssets({
    userId,
    limit: limit ?? 50,
    type: 'todo',
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
  })
}

export async function listWorkspaceTodosByDate(input: {
  userId: string
  startsAt: Date
  endsAt: Date
}): Promise<AssetListItem[]> {
  const todos = await listTodosByDueDate({
    userId: input.userId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
  })
  return todos.map(toAssetListItemFromTodo)
}

export async function listWorkspaceTodoDateMarkers(input: {
  userId: string
  startsAt: Date
  endsAt: Date
}): Promise<string[]> {
  return listTodoDateMarkers({
    userId: input.userId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
  })
}

export async function listWorkspaceUnscheduledTodos(input: {
  userId: string
  limit?: number
}): Promise<AssetListItem[]> {
  const todos = await listUnscheduledTodos({
    userId: input.userId,
    limit: input.limit ?? 50,
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
  })
  return todos.map(toAssetListItemFromTodo)
}

export async function listWorkspaceOverdueTodos(input: {
  userId: string
  before: Date
  limit?: number
}): Promise<AssetListItem[]> {
  const todos = await listOverdueTodos({
    userId: input.userId,
    before: input.before,
    limit: input.limit ?? 50,
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.ACTIVE,
  })
  return todos.map(toAssetListItemFromTodo)
}

export async function listWorkspaceCompletedTodos(input: {
  userId: string
  limit?: number
}): Promise<AssetListItem[]> {
  const todos = await listCompletedTodos({
    userId: input.userId,
    limit: input.limit ?? 20,
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
  timeFilter?: WorkspaceAgentTimeFilter | null
  completionHint?: 'complete' | 'incomplete' | null
}): Promise<AssetListItem[]> {
  return searchWorkspaceAssetsService(input)
}
