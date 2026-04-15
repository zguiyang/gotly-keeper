'use server'

import { revalidatePath } from 'next/cache'

import { ModuleActionError, MODULE_ACTION_ERROR_CODES } from '@/server/modules/actions/action-error'
import { executeModuleAction } from '@/server/modules/actions/run-server-action'
import { requireSignedInUser } from '@/server/modules/auth/session'
import {
  createWorkspaceAsset,
  setWorkspaceTodoCompletion,
  reviewWorkspaceUnfinishedTodos,
  summarizeWorkspaceRecentNotes,
  summarizeWorkspaceRecentBookmarks,
  WorkspaceModuleError,
  WORKSPACE_MODULE_ERROR_CODES,
} from '@/server/modules/workspace'
import { type AssetListItem, type WorkspaceAssetActionResult } from '@/shared/assets/assets.types'

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

      revalidatePath('/workspace')
      revalidatePath('/workspace/all')
      revalidatePath('/workspace/todos')

      return result
    } catch (error) {
      if (
        error instanceof WorkspaceModuleError &&
        error.code === WORKSPACE_MODULE_ERROR_CODES.TODO_NOT_FOUND
      ) {
        throw new ModuleActionError(
          error.publicMessage,
          MODULE_ACTION_ERROR_CODES.TODO_NOT_FOUND
        )
      }
      throw error
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
