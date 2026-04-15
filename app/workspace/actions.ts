'use server'

import { revalidatePath } from 'next/cache'

import { ActionError, ACTION_ERROR_CODES } from '@/server/modules/actions/action-error'
import { runServerAction } from '@/server/modules/actions/run-server-action'
import { requireUser } from '@/server/modules/auth/session'
import {
  createWorkspaceAssetUseCase,
  setTodoCompletionUseCase,
  reviewUnfinishedTodosUseCase,
  summarizeRecentNotesUseCase,
  summarizeRecentBookmarksUseCase,
  WorkspaceApplicationError,
  WORKSPACE_APPLICATION_ERROR_CODES,
} from '@/server/modules/workspace'
import { type AssetListItem, type WorkspaceAssetActionResult } from '@/shared/assets/assets.types'

export async function createWorkspaceAssetAction(
  input: unknown
): Promise<WorkspaceAssetActionResult> {
  return runServerAction('workspace.createAsset', async () => {
    const user = await requireUser()

    if (typeof input !== 'string') {
      throw new ActionError('先输入一句内容。', ACTION_ERROR_CODES.EMPTY_INPUT)
    }

    const trimmed = input.trim()
    if (!trimmed) {
      throw new ActionError('先输入一句内容。', ACTION_ERROR_CODES.EMPTY_INPUT)
    }

    const result = await createWorkspaceAssetUseCase({ userId: user.id, text: trimmed })

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
    throw new ActionError('待办状态更新失败，请重试。', ACTION_ERROR_CODES.INVALID_TODO_COMPLETION_INPUT)
  }

  const { assetId, completed } = input

  if (typeof assetId !== 'string' || !assetId.trim() || typeof completed !== 'boolean') {
    throw new ActionError('待办状态更新失败，请重试。', ACTION_ERROR_CODES.INVALID_TODO_COMPLETION_INPUT)
  }

  return { assetId: assetId.trim(), completed }
}

export async function setTodoCompletionAction(
  input: unknown
): Promise<AssetListItem> {
  return runServerAction('workspace.setTodoCompletion', async () => {
    const user = await requireUser()
    const parsed = parseTodoCompletionInput(input)

    try {
      const result = await setTodoCompletionUseCase({
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
        error instanceof WorkspaceApplicationError &&
        error.code === WORKSPACE_APPLICATION_ERROR_CODES.TODO_NOT_FOUND
      ) {
        throw new ActionError(
          error.publicMessage,
          ACTION_ERROR_CODES.TODO_NOT_FOUND
        )
      }
      throw error
    }
  })
}

export async function reviewUnfinishedTodosAction(): Promise<WorkspaceAssetActionResult> {
  return runServerAction('workspace.reviewUnfinishedTodos', async () => {
    const user = await requireUser()
    const review = await reviewUnfinishedTodosUseCase({ userId: user.id })
    return { kind: 'todo-review', review }
  })
}

export async function summarizeRecentNotesAction(): Promise<WorkspaceAssetActionResult> {
  return runServerAction('workspace.summarizeRecentNotes', async () => {
    const user = await requireUser()
    const summary = await summarizeRecentNotesUseCase({ userId: user.id })
    return { kind: 'note-summary', summary }
  })
}

export async function summarizeRecentBookmarksAction(): Promise<WorkspaceAssetActionResult> {
  return runServerAction('workspace.summarizeRecentBookmarks', async () => {
    const user = await requireUser()
    const summary = await summarizeRecentBookmarksUseCase({ userId: user.id })
    return { kind: 'bookmark-summary', summary }
  })
}
