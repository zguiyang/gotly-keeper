'use client'

import { useCallback, useState } from 'react'

import {
  createWorkspaceAsset,
  reviewUnfinishedTodos,
  summarizeRecentNotes,
  summarizeRecentBookmarks,
  type WorkspaceAssetActionResult,
} from '@/client/actions/workspace-actions.client'
import { callAction } from '@/client/feedback/toast-action'

import {
  applyWorkspaceActionResult,
  clearWorkspaceResultPanels,
  createInitialWorkspaceActionState,
  toError,
  toSubmitting,
  type WorkspaceActionState,
} from './use-workspace-action-state'

export function useWorkspaceSubmit() {
  const [state, setState] = useState<WorkspaceActionState>(createInitialWorkspaceActionState)

  const runAction = useCallback(
    async ({
      action,
      toast,
      fallbackError,
    }: {
      action: () => Promise<WorkspaceAssetActionResult>
      toast: {
        loading: string
        success: string
        error: string
      }
      fallbackError: string
    }): Promise<WorkspaceAssetActionResult | null> => {
      setState((prev) => toSubmitting(prev))

      try {
        const result = await callAction<WorkspaceAssetActionResult>(action, toast)
        setState((prev) => applyWorkspaceActionResult(prev, result))
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : fallbackError
        setState((prev) => toError(prev, message))
        return null
      }
    },
    []
  )

  const submit = useCallback(
    (input: unknown): Promise<WorkspaceAssetActionResult | null> =>
      runAction({
        action: () => createWorkspaceAsset(input),
        toast: {
          loading: '正在处理...',
          success: '处理成功',
          error: '处理失败，请重试',
        },
        fallbackError: '处理失败，请重试。',
      }),
    [runAction]
  )

  const reviewTodos = useCallback(async () => {
    await runAction({
      action: () => reviewUnfinishedTodos(),
      toast: {
        loading: '正在复盘待办...',
        success: '复盘完成',
        error: '复盘失败，请重试',
      },
      fallbackError: '复盘失败，请重试。',
    })
  }, [runAction])

  const summarizeNotes = useCallback(async () => {
    await runAction({
      action: () => summarizeRecentNotes(),
      toast: {
        loading: '正在生成笔记摘要...',
        success: '摘要生成成功',
        error: '摘要生成失败，请重试',
      },
      fallbackError: '摘要生成失败，请重试。',
    })
  }, [runAction])

  const summarizeBookmarks = useCallback(async () => {
    await runAction({
      action: () => summarizeRecentBookmarks(),
      toast: {
        loading: '正在生成书签摘要...',
        success: '书签摘要生成成功',
        error: '书签摘要生成失败，请重试',
      },
      fallbackError: '书签摘要生成失败，请重试。',
    })
  }, [runAction])

  const clearPanels = useCallback(() => {
    setState((prev) => clearWorkspaceResultPanels(prev))
  }, [])

  const reset = useCallback(() => {
    setState(createInitialWorkspaceActionState())
  }, [])

  return {
    state,
    submit,
    reviewTodos,
    summarizeNotes,
    summarizeBookmarks,
    clearPanels,
    reset,
  }
}
