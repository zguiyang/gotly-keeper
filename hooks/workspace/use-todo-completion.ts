'use client'

import { useCallback, useState } from 'react'

import { setTodoCompletion } from '@/client/actions/workspace-actions.client'
import { callAction } from '@/client/feedback/toast-action'
import type { AssetListItem } from '@/server/assets/assets.service'

export type TodoCompletionState = {
  pendingId: string | null
  error: string | null
}

export function useTodoCompletion() {
  const [state, setState] = useState<TodoCompletionState>({
    pendingId: null,
    error: null,
  })

  const toggleCompletion = useCallback(
    async (assetId: string, completed: boolean): Promise<AssetListItem | null> => {
      setState({ pendingId: assetId, error: null })

      try {
        const result = await callAction<AssetListItem>(
          () => setTodoCompletion({ assetId, completed }),
          {
            loading: '正在更新...',
            success: completed ? '已标记为完成' : '已取消完成',
            error: '更新失败，请重试',
          }
        )

        setState({ pendingId: null, error: null })
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : '更新失败，请重试。'
        setState({ pendingId: null, error: message })
        return null
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    state,
    toggleCompletion,
    clearError,
  }
}
