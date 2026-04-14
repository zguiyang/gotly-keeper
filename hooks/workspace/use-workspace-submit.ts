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

  const submit = useCallback(
    async (input: unknown) => {
      setState((prev) => toSubmitting(prev))

      try {
        const result = await callAction<WorkspaceAssetActionResult>(
          () => createWorkspaceAsset(input),
          {
            loading: '正在处理...',
            success: '处理成功',
            error: '处理失败，请重试',
          }
        )

        setState((prev) => applyWorkspaceActionResult(prev, result))
      } catch (error) {
        const message = error instanceof Error ? error.message : '处理失败，请重试。'
        setState((prev) => toError(prev, message))
      }
    },
    []
  )

  const reviewTodos = useCallback(async () => {
    setState((prev) => toSubmitting(prev))

    try {
      const result = await callAction<WorkspaceAssetActionResult>(
        () => reviewUnfinishedTodos(),
        {
          loading: '正在复盘待办...',
          success: '复盘完成',
          error: '复盘失败，请重试',
        }
      )

      setState((prev) => applyWorkspaceActionResult(prev, result))
    } catch (error) {
      const message = error instanceof Error ? error.message : '复盘失败，请重试。'
      setState((prev) => toError(prev, message))
    }
  }, [])

  const summarizeNotes = useCallback(async () => {
    setState((prev) => toSubmitting(prev))

    try {
      const result = await callAction<WorkspaceAssetActionResult>(
        () => summarizeRecentNotes(),
        {
          loading: '正在生成笔记摘要...',
          success: '摘要生成成功',
          error: '摘要生成失败，请重试',
        }
      )

      setState((prev) => applyWorkspaceActionResult(prev, result))
    } catch (error) {
      const message = error instanceof Error ? error.message : '摘要生成失败，请重试。'
      setState((prev) => toError(prev, message))
    }
  }, [])

  const summarizeBookmarks = useCallback(async () => {
    setState((prev) => toSubmitting(prev))

    try {
      const result = await callAction<WorkspaceAssetActionResult>(
        () => summarizeRecentBookmarks(),
        {
          loading: '正在生成书签摘要...',
          success: '书签摘要生成成功',
          error: '书签摘要生成失败，请重试',
        }
      )

      setState((prev) => applyWorkspaceActionResult(prev, result))
    } catch (error) {
      const message = error instanceof Error ? error.message : '书签摘要生成失败，请重试。'
      setState((prev) => toError(prev, message))
    }
  }, [])

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
