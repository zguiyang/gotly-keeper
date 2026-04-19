'use client'

import { useCallback, useMemo, useState } from 'react'

import {
  archiveWorkspaceAsset,
  moveWorkspaceAssetToTrash,
  purgeWorkspaceAsset,
  restoreWorkspaceAssetFromTrash,
  unarchiveWorkspaceAsset,
  updateWorkspaceAsset,
} from '@/client/actions/workspace-actions.client'
import { callAction } from '@/client/feedback/toast-action'

import type { AssetListItem } from '@/shared/assets/assets.types'

type MutationAction = 'update' | 'archive' | 'unarchive' | 'trash' | 'restore' | 'purge'

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
    async <T>(assetId: string, action: MutationAction, runner: () => Promise<T>): Promise<T | null> => {
      setError(null)
      setPendingFor(assetId, action, true)
      try {
        const result = await runner()
        setPendingFor(assetId, action, false)
        return result
      } catch (mutationError) {
        setPendingFor(assetId, action, false)
        setError(mutationError instanceof Error ? mutationError.message : '操作失败，请重试。')
        return null
      }
    },
    [setPendingFor]
  )

  const updateAsset = useCallback(
    async (input: UpdateAssetInput): Promise<AssetListItem | null> => {
      return runMutation(input.assetId, 'update', () =>
        callAction(() => updateWorkspaceAsset(input), {
          loading: '正在更新...',
          success: '更新成功',
          error: '更新失败，请重试',
        })
      )
    },
    [runMutation]
  )

  const archiveAsset = useCallback(
    async (assetId: string, assetType: AssetListItem['type']): Promise<AssetListItem | null> => {
      return runMutation(assetId, 'archive', () =>
        callAction(() => archiveWorkspaceAsset({ assetId, assetType }), {
          loading: '正在归档...',
          success: '已归档',
          error: '归档失败，请重试',
        })
      )
    },
    [runMutation]
  )

  const unarchiveAsset = useCallback(
    async (assetId: string, assetType: AssetListItem['type']): Promise<AssetListItem | null> => {
      return runMutation(assetId, 'unarchive', () =>
        callAction(() => unarchiveWorkspaceAsset({ assetId, assetType }), {
          loading: '正在恢复...',
          success: '已取消归档',
          error: '操作失败，请重试',
        })
      )
    },
    [runMutation]
  )

  const moveToTrash = useCallback(
    async (assetId: string, assetType: AssetListItem['type']): Promise<AssetListItem | null> => {
      return runMutation(assetId, 'trash', () =>
        callAction(() => moveWorkspaceAssetToTrash({ assetId, assetType }), {
          loading: '正在移入回收站...',
          success: '已移入回收站',
          error: '删除失败，请重试',
        })
      )
    },
    [runMutation]
  )

  const restoreFromTrash = useCallback(
    async (assetId: string, assetType: AssetListItem['type']): Promise<AssetListItem | null> => {
      return runMutation(assetId, 'restore', () =>
        callAction(() => restoreWorkspaceAssetFromTrash({ assetId, assetType }), {
          loading: '正在恢复...',
          success: '已恢复',
          error: '恢复失败，请重试',
        })
      )
    },
    [runMutation]
  )

  const purgeAsset = useCallback(
    async (assetId: string, assetType: AssetListItem['type']): Promise<{ id: string; type: AssetListItem['type'] } | null> => {
      return runMutation(assetId, 'purge', () =>
        callAction(() => purgeWorkspaceAsset({ assetId, assetType }), {
          loading: '正在永久删除...',
          success: '已永久删除',
          error: '永久删除失败，请重试',
        })
      )
    },
    [runMutation]
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
