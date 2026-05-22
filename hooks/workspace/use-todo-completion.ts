'use client'

import { useCallback, useState } from 'react'

import { setTodoCompletion } from '@/client/actions/workspace-actions.client'
import { callAction } from '@/client/feedback/toast-action'
import { useTranslations } from '@/hooks/use-locale'

import type { AssetListItem } from '@/shared/assets/assets.types'

export type TodoCompletionState = {
  pendingId: string | null
  error: string | null
}

export function useTodoCompletion() {
  const t = useTranslations('common.errors')
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
            loading: t('generic'),
            success: completed ? t('generic') : t('generic'),
            error: t('generic'),
          }
        )

        setState({ pendingId: null, error: null })
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : t('generic')
        setState({ pendingId: null, error: message })
        return null
      }
    },
    [t]
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
