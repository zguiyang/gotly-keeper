'use server'

import { revalidatePath } from 'next/cache'

import { ActionError } from '@/server/actions/action-error'
import { runServerAction } from '@/server/actions/run-server-action'
import { requireUser } from '@/server/auth/session'
import { createAsset, searchAssets, setTodoCompletion, type AssetListItem } from '@/server/assets/assets.service'
import { reviewUnfinishedTodos } from '@/server/assets/assets.todo-review'
import { summarizeRecentNotes } from '@/server/assets/assets.note-summary'
import { summarizeRecentBookmarks } from '@/server/assets/assets.bookmark-summary'
import { type WorkspaceAssetActionResult } from '@/shared/assets/assets.types'

export async function createWorkspaceAssetAction(
  input: unknown
): Promise<WorkspaceAssetActionResult> {
  return runServerAction('workspace.createAsset', async () => {
    const user = await requireUser()

    if (typeof input !== 'string') {
      throw new ActionError('先输入一句内容。', 'EMPTY_INPUT')
    }

    const trimmed = input.trim()
    if (!trimmed) {
      throw new ActionError('先输入一句内容。', 'EMPTY_INPUT')
    }

    const result = await createAsset({ userId: user.id, text: trimmed })

    if (result.kind === 'search') {
      const results = await searchAssets({
        userId: user.id,
        query: result.query || trimmed,
        typeHint: result.typeHint,
        timeHint: result.timeHint,
        completionHint: result.completionHint,
        limit: 5,
      })

      return {
        kind: 'query',
        query: result.query || trimmed,
        results,
      }
    }

    if (result.kind === 'summary') {
      if (result.summaryTarget === 'unfinished_todos') {
        const review = await reviewUnfinishedTodos(user.id)
        return { kind: 'todo-review', review }
      }

      if (result.summaryTarget === 'recent_notes') {
        const summary = await summarizeRecentNotes(user.id)
        return { kind: 'note-summary', summary }
      }

      const summary = await summarizeRecentBookmarks(user.id)
      return { kind: 'bookmark-summary', summary }
    }

    revalidatePath('/workspace')
    return { kind: 'created', asset: result.asset }
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
    throw new ActionError('待办状态更新失败，请重试。', 'INVALID_TODO_COMPLETION_INPUT')
  }

  const { assetId, completed } = input

  if (typeof assetId !== 'string' || !assetId.trim() || typeof completed !== 'boolean') {
    throw new ActionError('待办状态更新失败，请重试。', 'INVALID_TODO_COMPLETION_INPUT')
  }

  return { assetId: assetId.trim(), completed }
}

export async function setTodoCompletionAction(
  input: unknown
): Promise<AssetListItem> {
  return runServerAction('workspace.setTodoCompletion', async () => {
    const user = await requireUser()
    const parsed = parseTodoCompletionInput(input)

    const updated = await setTodoCompletion({
      userId: user.id,
      assetId: parsed.assetId,
      completed: parsed.completed,
    })

    if (!updated) {
      throw new ActionError('没有找到这条待办，或你没有权限更新它。', 'TODO_NOT_FOUND')
    }

    revalidatePath('/workspace')
    revalidatePath('/workspace/all')
    revalidatePath('/workspace/todos')

    return updated
  })
}

export async function reviewUnfinishedTodosAction(): Promise<WorkspaceAssetActionResult> {
  return runServerAction('workspace.reviewUnfinishedTodos', async () => {
    const user = await requireUser()
    const review = await reviewUnfinishedTodos(user.id)
    return { kind: 'todo-review', review }
  })
}

export async function summarizeRecentNotesAction(): Promise<WorkspaceAssetActionResult> {
  return runServerAction('workspace.summarizeRecentNotes', async () => {
    const user = await requireUser()
    const summary = await summarizeRecentNotes(user.id)
    return { kind: 'note-summary', summary }
  })
}

export async function summarizeRecentBookmarksAction(): Promise<WorkspaceAssetActionResult> {
  return runServerAction('workspace.summarizeRecentBookmarks', async () => {
    const user = await requireUser()
    const summary = await summarizeRecentBookmarks(user.id)
    return { kind: 'bookmark-summary', summary }
  })
}