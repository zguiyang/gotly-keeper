'use client'

import { useCallback, useState } from 'react'

import { loadWorkspaceAssetsPage } from '@/client/actions/workspace-actions.client'

import type { AssetLifecycleStatus } from '@/shared/assets/asset-lifecycle.types'
import type { AssetListItem } from '@/shared/assets/assets.types'
import type { PaginatedResult } from '@/shared/pagination'

type WorkspaceAssetType = AssetListItem['type']

type WorkspaceAssetsPageQuery = {
  type?: WorkspaceAssetType
  lifecycleStatus?: AssetLifecycleStatus
  pageSize?: number
}

function mergeAssetsById(current: AssetListItem[], nextItems: AssetListItem[]) {
  const seen = new Set<string>()
  const merged: AssetListItem[] = []

  for (const item of [...current, ...nextItems]) {
    if (seen.has(item.id)) {
      continue
    }

    seen.add(item.id)
    merged.push(item)
  }

  return merged
}

export function useWorkspaceAssetsPage({
  initialPage,
  initialQuery,
}: {
  initialPage: PaginatedResult<AssetListItem>
  initialQuery?: WorkspaceAssetsPageQuery
}) {
  const [items, setItems] = useState(initialPage.items)
  const [pageInfo, setPageInfo] = useState(initialPage.pageInfo)
  const [query, setQuery] = useState<WorkspaceAssetsPageQuery>(initialQuery ?? {})
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadFirstPage = useCallback(
    async (nextQuery: WorkspaceAssetsPageQuery = query) => {
      setRefreshing(true)
      try {
        const page = await loadWorkspaceAssetsPage({
          ...nextQuery,
          cursor: null,
        })
        setQuery(nextQuery)
        setItems(page.items)
        setPageInfo(page.pageInfo)
        return page
      } finally {
        setRefreshing(false)
      }
    },
    [query]
  )

  const loadMore = useCallback(async () => {
    if (!pageInfo.hasNextPage || !pageInfo.nextCursor || loadingMore) {
      return null
    }

    setLoadingMore(true)
    try {
      const page = await loadWorkspaceAssetsPage({
        ...query,
        cursor: pageInfo.nextCursor,
      })
      setItems((current) => mergeAssetsById(current, page.items))
      setPageInfo(page.pageInfo)
      return page
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, pageInfo.hasNextPage, pageInfo.nextCursor, query])

  return {
    items,
    setItems,
    pageInfo,
    query,
    loadingMore,
    refreshing,
    loadFirstPage,
    loadMore,
  }
}
