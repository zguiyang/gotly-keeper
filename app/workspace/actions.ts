'use server'

import { revalidatePath } from 'next/cache'

import { ModuleActionError, MODULE_ACTION_ERROR_CODES } from '@/server/modules/actions/action-error'
import { executeModuleAction } from '@/server/modules/actions/run-server-action'
import { requireSignedInUser } from '@/server/modules/auth/session'
import {
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
import { type AssetListItem, type WorkspaceAssetActionResult } from '@/shared/assets/assets.types'

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
      rawInput: rawInput.trim(),
      title,
      content,
      summary: content,
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
