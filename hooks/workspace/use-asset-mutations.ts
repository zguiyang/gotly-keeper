'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  archiveWorkspaceAsset,
  moveWorkspaceAssetToTrash,
  purgeWorkspaceAsset,
  restoreWorkspaceAssetFromTrash,
  unarchiveWorkspaceAsset,
  updateWorkspaceAsset,
} from '@/client/actions/workspace-actions.client'
import { callAction } from '@/client/feedback/toast-action'
import { useTranslations } from '@/hooks/use-locale'

import type { AssetListItem } from '@/shared/assets/assets.types'

type MutationAction = 'update' | 'archive' | 'unarchive' | 'trash' | 'restore' | 'purge'

type UndoOptions = {
  onUndo?: (asset: AssetListItem) => void
}

type MutationRunOptions = {
  throwOnError?: boolean
}

type UpdateAssetOptions = {
  silent?: boolean
}

type UpdateAssetInput =
  | {
      assetId: string
      assetType: 'note'
      rawInput: string
      title?: string | null
      content?: string | null
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
      url: string
    }

function makePendingKey(assetId: string, action: MutationAction) {
  return `${assetId}:${action}`
}

export function useAssetMutations() {
  const t = useTranslations('workspace.mutations')
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const setPendingFor = useCallback((assetId: string, action: MutationAction, value: boolean) => {
    const key = makePendingKey(assetId, action)
    setPending((prev) => {
      if (value) {
        return { ...prev, [key]: true }
      }

      if (!prev[key]) {
        return prev
      }

      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const runMutation = useCallback(
    async <T>(
      assetId: string,
      action: MutationAction,
      runner: () => Promise<T>,
      options?: MutationRunOptions
    ): Promise<T | null> => {
      setError(null)
      setPendingFor(assetId, action, true)
      try {
        const result = await runner()
        setPendingFor(assetId, action, false)
        return result
      } catch (mutationError) {
        setPendingFor(assetId, action, false)
        setError(mutationError instanceof Error ? mutationError.message : t('generic'))
        if (options?.throwOnError) {
          throw mutationError
        }
        return null
      }
    },
    [setPendingFor, t]
  )

  const updateAsset = useCallback(
    async (input: UpdateAssetInput, options?: UpdateAssetOptions): Promise<AssetListItem | null> => {
      if (options?.silent) {
        return runMutation(input.assetId, 'update', () => updateWorkspaceAsset(input), {
          throwOnError: true,
        })
      }

      return runMutation(input.assetId, 'update', () =>
        callAction(() => updateWorkspaceAsset(input), {
          loading: t('updating'),
          success: t('updateSuccess'),
          error: t('updateFailed'),
        })
      )
    },
    [runMutation, t]
  )

  const archiveAsset = useCallback(
    async (
      assetId: string,
      assetType: AssetListItem['type'],
      options?: UndoOptions
    ): Promise<AssetListItem | null> => {
      const result = await runMutation(assetId, 'archive', () =>
        callAction(() => archiveWorkspaceAsset({ assetId, assetType }), {
          loading: t('archiving'),
          error: t('archiveFailed'),
        })
      )

      if (result) {
        toast.success(t('archiveSuccessTitle'), {
          description: t('archiveSuccessDescription'),
          action: options?.onUndo
            ? {
                label: t('undo'),
                onClick: () => {
                  void runMutation(assetId, 'unarchive', async () => {
                    const restored = await callAction(
                      () => unarchiveWorkspaceAsset({ assetId, assetType }),
                      {
                        loading: t('restoringArchive'),
                        success: t('restoreSuccess'),
                        error: t('restoreFailed'),
                      }
                    )
                    options.onUndo?.(restored)
                    return restored
                  })
                },
              }
            : undefined,
        })
      }

      return result
    },
    [runMutation, t]
  )

  const unarchiveAsset = useCallback(
    async (assetId: string, assetType: AssetListItem['type']): Promise<AssetListItem | null> => {
      return runMutation(assetId, 'unarchive', () =>
        callAction(() => unarchiveWorkspaceAsset({ assetId, assetType }), {
          loading: t('restoringArchive'),
          success: t('restoreSuccess'),
          error: t('restoreFailed'),
        })
      )
    },
    [runMutation, t]
  )

  const moveToTrash = useCallback(
    async (
      assetId: string,
      assetType: AssetListItem['type'],
      options?: UndoOptions
    ): Promise<AssetListItem | null> => {
      const result = await runMutation(assetId, 'trash', () =>
        callAction(() => moveWorkspaceAssetToTrash({ assetId, assetType }), {
          loading: t('movingToTrash'),
          error: t('moveToTrashFailed'),
        })
      )

      if (result) {
        toast.success(t('moveToTrashSuccessTitle'), {
          description: t('moveToTrashSuccessDescription'),
          action: options?.onUndo
            ? {
                label: t('undo'),
                onClick: () => {
                  void runMutation(assetId, 'restore', async () => {
                    const restored = await callAction(
                      () => restoreWorkspaceAssetFromTrash({ assetId, assetType }),
                      {
                        loading: t('restoringFromTrash'),
                        success: t('restoreSuccess'),
                        error: t('restoreFailed'),
                      }
                    )
                    options.onUndo?.(restored)
                    return restored
                  })
                },
              }
            : undefined,
        })
      }

      return result
    },
    [runMutation, t]
  )

  const restoreFromTrash = useCallback(
    async (assetId: string, assetType: AssetListItem['type']): Promise<AssetListItem | null> => {
      return runMutation(assetId, 'restore', () =>
        callAction(() => restoreWorkspaceAssetFromTrash({ assetId, assetType }), {
          loading: t('restoringFromTrash'),
          success: t('restoreSuccess'),
          error: t('restoreFailed'),
        })
      )
    },
    [runMutation, t]
  )

  const purgeAsset = useCallback(
    async (assetId: string, assetType: AssetListItem['type']): Promise<{ id: string; type: AssetListItem['type'] } | null> => {
      return runMutation(assetId, 'purge', () =>
        callAction(() => purgeWorkspaceAsset({ assetId, assetType }), {
          loading: t('deletingPermanently'),
          success: t('deleteSuccess'),
          error: t('deleteFailed'),
        })
      )
    },
    [runMutation, t]
  )

  const isPending = useCallback(
    (assetId: string, action: MutationAction) => Boolean(pending[makePendingKey(assetId, action)]),
    [pending]
  )

  const hasPending = useMemo(() => Object.keys(pending).length > 0, [pending])

  const clearError = useCallback(() => setError(null), [])

  return {
    state: {
      hasPending,
      error,
    },
    isPending,
    clearError,
    updateAsset,
    archiveAsset,
    unarchiveAsset,
    moveToTrash,
    restoreFromTrash,
    purgeAsset,
  }
}
