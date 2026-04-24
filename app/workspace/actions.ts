'use server'

import { revalidatePath } from 'next/cache'

import { ModuleActionError, MODULE_ACTION_ERROR_CODES } from '@/server/modules/actions/action-error'
import { executeModuleAction } from '@/server/modules/actions/run-server-action'
import { requireSignedInUser } from '@/server/modules/auth/session'
import {
  listWorkspaceAssetsPage,
  listWorkspaceTodoDateMarkers,
  listWorkspaceTodosByDate,
  archiveWorkspaceAsset,
  createWorkspaceAsset,
  moveWorkspaceAssetToTrash,
  purgeWorkspaceAsset,
  restoreWorkspaceAssetFromTrash,
  reviewWorkspaceUnfinishedTodos,
  setWorkspaceTodoCompletion,
  summarizeWorkspaceRecentBookmarks,
  summarizeWorkspaceRecentNotes,
  unarchiveWorkspaceAsset,
  updateWorkspaceBookmark,
  updateWorkspaceNote,
  updateWorkspaceTodo,
  WorkspaceModuleError,
  WORKSPACE_MODULE_ERROR_CODES,
} from '@/server/modules/workspace'
import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'
import { type AssetListItem, type WorkspaceAssetActionResult } from '@/shared/assets/assets.types'
import { type PaginatedResult } from '@/shared/pagination'

type WorkspaceAssetType = 'note' | 'todo' | 'link'

const WORKSPACE_REVALIDATE_PATHS = [
  '/workspace',
  '/workspace/all',
  '/workspace/notes',
  '/workspace/todos',
  '/workspace/bookmarks',
  '/workspace/archive',
  '/workspace/trash',
] as const

function revalidateWorkspacePaths() {
  for (const path of WORKSPACE_REVALIDATE_PATHS) {
    revalidatePath(path)
  }
}

function parseAssetType(value: unknown): WorkspaceAssetType {
  if (value === 'note' || value === 'todo' || value === 'link') {
    return value
  }

  throw new ModuleActionError('资产参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
}

function parseOptionalAssetType(value: unknown): WorkspaceAssetType | undefined {
  if (value === undefined || value === null || value === '' || value === 'all') {
    return undefined
  }

  return parseAssetType(value)
}

function parseLifecycleStatus(value: unknown): AssetLifecycleStatus | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (
    value === ASSET_LIFECYCLE_STATUS.ACTIVE ||
    value === ASSET_LIFECYCLE_STATUS.ARCHIVED ||
    value === ASSET_LIFECYCLE_STATUS.TRASHED
  ) {
    return value
  }

  throw new ModuleActionError('列表状态参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
}

function parsePageSize(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 100) {
    throw new ModuleActionError('分页参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  return value
}

function parseCursor(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null || value === '') {
    return null
  }

  if (typeof value !== 'string') {
    throw new ModuleActionError('分页参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  return value
}

function parseWorkspaceAssetsPageInput(input: unknown): {
  type?: WorkspaceAssetType
  lifecycleStatus?: AssetLifecycleStatus
  pageSize?: number
  cursor?: string | null
} {
  if (input === undefined || input === null) {
    return {}
  }

  if (typeof input !== 'object') {
    throw new ModuleActionError('分页参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  return {
    type: parseOptionalAssetType('type' in input ? input.type : undefined),
    lifecycleStatus: parseLifecycleStatus(
      'lifecycleStatus' in input ? input.lifecycleStatus : undefined
    ),
    pageSize: parsePageSize('pageSize' in input ? input.pageSize : undefined),
    cursor: parseCursor('cursor' in input ? input.cursor : undefined),
  }
}

function parseDateInput(value: unknown, message = '日期参数错误，请重试。'): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }

  throw new ModuleActionError(message, MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
}

function parseDateKeyInput(value: unknown): { startsAt: Date; endsAt: Date } {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ModuleActionError('日期参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  const startsAt = new Date(`${value}T00:00:00+08:00`)
  const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000)
  return { startsAt, endsAt }
}

function parseTodoDateInput(input: unknown): { startsAt: Date; endsAt: Date } {
  if (!input || typeof input !== 'object' || !('date' in input)) {
    throw new ModuleActionError('日期参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  return parseDateKeyInput(input.date)
}

function parseTodoDateMarkersInput(input: unknown): { startsAt: Date; endsAt: Date } {
  if (!input || typeof input !== 'object' || !('startsAt' in input) || !('endsAt' in input)) {
    throw new ModuleActionError('日期范围参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  const startsAt = parseDateInput(input.startsAt, '日期范围参数错误，请重试。')
  const endsAt = parseDateInput(input.endsAt, '日期范围参数错误，请重试。')

  if (startsAt >= endsAt) {
    throw new ModuleActionError('日期范围参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  return { startsAt, endsAt }
}

function parseAssetRefInput(input: unknown): {
  assetId: string
  assetType: WorkspaceAssetType
} {
  if (!input || typeof input !== 'object' || !('assetId' in input) || !('assetType' in input)) {
    throw new ModuleActionError('资产参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  const { assetId, assetType } = input
  if (typeof assetId !== 'string' || !assetId.trim()) {
    throw new ModuleActionError('资产参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  return {
    assetId: assetId.trim(),
    assetType: parseAssetType(assetType),
  }
}

function parseDueAt(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === '') {
    return null
  }

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw
  }

  if (typeof raw === 'string') {
    const value = new Date(raw)
    if (!Number.isNaN(value.getTime())) {
      return value
    }
  }

  throw new ModuleActionError('待办时间参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
}

function parseUpdateAssetInput(input: unknown):
  | {
      assetId: string
      assetType: 'note'
      rawInput: string
      title?: string | null
      content?: string | null
      summary?: string | null
    }
  | {
      assetId: string
      assetType: 'todo'
      rawInput: string
      title?: string | null
      content?: string | null
      timeText?: string | null
      dueAt?: Date | null
    }
  | {
      assetId: string
      assetType: 'link'
      rawInput: string
      title?: string | null
      note?: string | null
      summary?: string | null
      url: string
    } {
  const base = parseAssetRefInput(input)
  if (!input || typeof input !== 'object' || !('rawInput' in input)) {
    throw new ModuleActionError('资产更新参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  const { rawInput } = input
  if (typeof rawInput !== 'string' || !rawInput.trim()) {
    throw new ModuleActionError('请输入有效内容。', MODULE_ACTION_ERROR_CODES.EMPTY_INPUT)
  }

  const title =
    'title' in input && typeof input.title === 'string' ? input.title.trim() || null : undefined

  const content =
    'content' in input && typeof input.content === 'string' ? input.content.trim() || null : undefined

  if (base.assetType === 'note') {
    return {
      assetId: base.assetId,
      assetType: 'note',
      rawInput,
      title,
      content: 'content' in input && typeof input.content === 'string' ? (input.content.trim() ? input.content : null) : undefined,
    }
  }

  if (base.assetType === 'todo') {
    const timeText =
      'timeText' in input && typeof input.timeText === 'string'
        ? input.timeText.trim() || null
        : undefined

    return {
      assetId: base.assetId,
      assetType: 'todo',
      rawInput: rawInput.trim(),
      title,
      content,
      timeText,
      dueAt: 'dueAt' in input ? parseDueAt(input.dueAt) : undefined,
    }
  }

  if (!('url' in input) || typeof input.url !== 'string' || !input.url.trim()) {
    throw new ModuleActionError('书签链接不能为空。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  return {
    assetId: base.assetId,
    assetType: 'link',
    rawInput: rawInput.trim(),
    title,
    note: 'note' in input && typeof input.note === 'string' ? input.note.trim() || null : undefined,
    summary:
      'note' in input && typeof input.note === 'string' ? input.note.trim() || null : undefined,
    url: input.url.trim(),
  }
}

function mapWorkspaceModuleError(error: unknown): never {
  if (!(error instanceof WorkspaceModuleError)) {
    throw error
  }

  if (error.code === WORKSPACE_MODULE_ERROR_CODES.TODO_NOT_FOUND) {
    throw new ModuleActionError(error.publicMessage, MODULE_ACTION_ERROR_CODES.TODO_NOT_FOUND)
  }

  if (error.code === WORKSPACE_MODULE_ERROR_CODES.ASSET_NOT_FOUND) {
    throw new ModuleActionError(error.publicMessage, MODULE_ACTION_ERROR_CODES.ASSET_NOT_FOUND)
  }

  if (error.code === WORKSPACE_MODULE_ERROR_CODES.INVALID_LIFECYCLE_TRANSITION) {
    throw new ModuleActionError(
      error.publicMessage,
      MODULE_ACTION_ERROR_CODES.INVALID_LIFECYCLE_TRANSITION
    )
  }

  if (error.code === WORKSPACE_MODULE_ERROR_CODES.PURGE_REQUIRES_TRASHED_ASSET) {
    throw new ModuleActionError(
      error.publicMessage,
      MODULE_ACTION_ERROR_CODES.PURGE_REQUIRES_TRASHED_ASSET
    )
  }

  if (error.code === WORKSPACE_MODULE_ERROR_CODES.INVALID_ASSET_TYPE) {
    throw new ModuleActionError(error.publicMessage, MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
  }

  throw new ModuleActionError(error.publicMessage, MODULE_ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR)
}

export async function createWorkspaceAssetAction(
  input: unknown
): Promise<WorkspaceAssetActionResult> {
  return executeModuleAction('workspace.createAsset', async () => {
    const user = await requireSignedInUser()

    if (typeof input !== 'string') {
      throw new ModuleActionError('先输入一句内容。', MODULE_ACTION_ERROR_CODES.EMPTY_INPUT)
    }

    const trimmed = input.trim()
    if (!trimmed) {
      throw new ModuleActionError('先输入一句内容。', MODULE_ACTION_ERROR_CODES.EMPTY_INPUT)
    }

    const result = await createWorkspaceAsset({ userId: user.id, text: trimmed })

    revalidatePath('/workspace')
    return result
  })
}

export async function loadWorkspaceAssetsPageAction(
  input: unknown
): Promise<PaginatedResult<AssetListItem>> {
  return executeModuleAction('workspace.loadAssetsPage', async () => {
    const user = await requireSignedInUser()
    const parsed = parseWorkspaceAssetsPageInput(input)

    try {
      return await listWorkspaceAssetsPage({
        userId: user.id,
        type: parsed.type,
        lifecycleStatus: parsed.lifecycleStatus,
        pageSize: parsed.pageSize,
        cursor: parsed.cursor,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_CURSOR') {
        throw new ModuleActionError('分页参数错误，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_ASSET_INPUT)
      }
      mapWorkspaceModuleError(error)
    }
  })
}

export async function loadWorkspaceTodosByDateAction(input: unknown): Promise<AssetListItem[]> {
  return executeModuleAction('workspace.loadTodosByDate', async () => {
    const user = await requireSignedInUser()
    const { startsAt, endsAt } = parseTodoDateInput(input)

    return listWorkspaceTodosByDate({
      userId: user.id,
      startsAt,
      endsAt,
    })
  })
}

export async function loadWorkspaceTodoDateMarkersAction(input: unknown): Promise<string[]> {
  return executeModuleAction('workspace.loadTodoDateMarkers', async () => {
    const user = await requireSignedInUser()
    const { startsAt, endsAt } = parseTodoDateMarkersInput(input)

    return listWorkspaceTodoDateMarkers({
      userId: user.id,
      startsAt,
      endsAt,
    })
  })
}

function parseTodoCompletionInput(input: unknown): {
  assetId: string
  completed: boolean
} {
  if (
    !input ||
    typeof input !== 'object' ||
    !('assetId' in input) ||
    !('completed' in input)
  ) {
    throw new ModuleActionError('待办状态更新失败，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_TODO_COMPLETION_INPUT)
  }

  const { assetId, completed } = input

  if (typeof assetId !== 'string' || !assetId.trim() || typeof completed !== 'boolean') {
    throw new ModuleActionError('待办状态更新失败，请重试。', MODULE_ACTION_ERROR_CODES.INVALID_TODO_COMPLETION_INPUT)
  }

  return { assetId: assetId.trim(), completed }
}

export async function setTodoCompletionAction(
  input: unknown
): Promise<AssetListItem> {
  return executeModuleAction('workspace.setTodoCompletion', async () => {
    const user = await requireSignedInUser()
    const parsed = parseTodoCompletionInput(input)

    try {
      const result = await setWorkspaceTodoCompletion({
        userId: user.id,
        assetId: parsed.assetId,
        completed: parsed.completed,
      })

      revalidateWorkspacePaths()
      return result
    } catch (error) {
      mapWorkspaceModuleError(error)
    }
  })
}

export async function updateWorkspaceAssetAction(
  input: unknown
): Promise<AssetListItem> {
  return executeModuleAction('workspace.updateAsset', async () => {
    const user = await requireSignedInUser()
    const parsed = parseUpdateAssetInput(input)

    try {
      let result: AssetListItem
      if (parsed.assetType === 'note') {
        result = await updateWorkspaceNote({
          userId: user.id,
          assetId: parsed.assetId,
          rawInput: parsed.rawInput,
          title: parsed.title,
          content: parsed.content,
          summary: parsed.summary,
        })
      } else if (parsed.assetType === 'todo') {
        result = await updateWorkspaceTodo({
          userId: user.id,
          assetId: parsed.assetId,
          rawInput: parsed.rawInput,
          title: parsed.title,
          content: parsed.content,
          timeText: parsed.timeText,
          dueAt: parsed.dueAt,
        })
      } else {
        result = await updateWorkspaceBookmark({
          userId: user.id,
          assetId: parsed.assetId,
          rawInput: parsed.rawInput,
          url: parsed.url,
          title: parsed.title,
          note: parsed.note,
          summary: parsed.summary,
        })
      }

      revalidateWorkspacePaths()
      return result
    } catch (error) {
      mapWorkspaceModuleError(error)
    }
  })
}

export async function archiveWorkspaceAssetAction(input: unknown): Promise<AssetListItem> {
  return executeModuleAction('workspace.archiveAsset', async () => {
    const user = await requireSignedInUser()
    const parsed = parseAssetRefInput(input)

    try {
      const result = await archiveWorkspaceAsset({
        userId: user.id,
        assetId: parsed.assetId,
        assetType: parsed.assetType,
      })
      revalidateWorkspacePaths()
      return result
    } catch (error) {
      mapWorkspaceModuleError(error)
    }
  })
}

export async function unarchiveWorkspaceAssetAction(input: unknown): Promise<AssetListItem> {
  return executeModuleAction('workspace.unarchiveAsset', async () => {
    const user = await requireSignedInUser()
    const parsed = parseAssetRefInput(input)

    try {
      const result = await unarchiveWorkspaceAsset({
        userId: user.id,
        assetId: parsed.assetId,
        assetType: parsed.assetType,
      })
      revalidateWorkspacePaths()
      return result
    } catch (error) {
      mapWorkspaceModuleError(error)
    }
  })
}

export async function moveWorkspaceAssetToTrashAction(input: unknown): Promise<AssetListItem> {
  return executeModuleAction('workspace.moveAssetToTrash', async () => {
    const user = await requireSignedInUser()
    const parsed = parseAssetRefInput(input)

    try {
      const result = await moveWorkspaceAssetToTrash({
        userId: user.id,
        assetId: parsed.assetId,
        assetType: parsed.assetType,
      })
      revalidateWorkspacePaths()
      return result
    } catch (error) {
      mapWorkspaceModuleError(error)
    }
  })
}

export async function restoreWorkspaceAssetFromTrashAction(input: unknown): Promise<AssetListItem> {
  return executeModuleAction('workspace.restoreAssetFromTrash', async () => {
    const user = await requireSignedInUser()
    const parsed = parseAssetRefInput(input)

    try {
      const result = await restoreWorkspaceAssetFromTrash({
        userId: user.id,
        assetId: parsed.assetId,
        assetType: parsed.assetType,
      })
      revalidateWorkspacePaths()
      return result
    } catch (error) {
      mapWorkspaceModuleError(error)
    }
  })
}

export async function purgeWorkspaceAssetAction(
  input: unknown
): Promise<{ id: string; type: WorkspaceAssetType }> {
  return executeModuleAction('workspace.purgeAsset', async () => {
    const user = await requireSignedInUser()
    const parsed = parseAssetRefInput(input)

    try {
      const result = await purgeWorkspaceAsset({
        userId: user.id,
        assetId: parsed.assetId,
        assetType: parsed.assetType,
      })
      revalidateWorkspacePaths()
      return result
    } catch (error) {
      mapWorkspaceModuleError(error)
    }
  })
}

export async function reviewUnfinishedTodosAction(): Promise<WorkspaceAssetActionResult> {
  return executeModuleAction('workspace.reviewUnfinishedTodos', async () => {
    const user = await requireSignedInUser()
    const review = await reviewWorkspaceUnfinishedTodos({ userId: user.id })
    return { kind: 'todo-review', review }
  })
}

export async function summarizeRecentNotesAction(): Promise<WorkspaceAssetActionResult> {
  return executeModuleAction('workspace.summarizeRecentNotes', async () => {
    const user = await requireSignedInUser()
    const summary = await summarizeWorkspaceRecentNotes({ userId: user.id })
    return { kind: 'note-summary', summary }
  })
}

export async function summarizeRecentBookmarksAction(): Promise<WorkspaceAssetActionResult> {
  return executeModuleAction('workspace.summarizeRecentBookmarks', async () => {
    const user = await requireSignedInUser()
    const summary = await summarizeWorkspaceRecentBookmarks({ userId: user.id })
    return { kind: 'bookmark-summary', summary }
  })
}
