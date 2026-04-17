'use client'

import { useMemo, useState } from 'react'

import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { formatAssetRelativeTime } from '@/shared/assets/asset-time-display'

import type { AssetListItem } from '@/shared/assets/assets.types'

type AssetFilter = 'all' | 'note' | 'todo' | 'link'
type LifecycleViewMode = 'archive' | 'trash'

const FILTERS: Array<{ key: AssetFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'note', label: '笔记' },
  { key: 'todo', label: '待办' },
  { key: 'link', label: '书签' },
]

function typeLabel(type: AssetListItem['type']): string {
  if (type === 'note') return '笔记'
  if (type === 'todo') return '待办'
  return '书签'
}

function EmptyState({ mode }: { mode: LifecycleViewMode }) {
  return (
    <div className="mt-14 text-center py-12 border-2 border-dashed border-outline-variant/10 rounded-lg">
      <p className="text-sm text-on-surface-variant font-medium">
        {mode === 'archive' ? '暂无归档内容' : '回收站为空'}
      </p>
      <p className="text-xs text-on-surface-variant/60 mt-2">
        {mode === 'archive'
          ? '归档内容默认不会出现在普通列表中。'
          : '已删除内容可在这里恢复，或永久删除。'}
      </p>
    </div>
  )
}

export function LifecycleAssetsClient({
  assets,
  mode,
}: {
  assets: AssetListItem[]
  mode: LifecycleViewMode
}) {
  const [items, setItems] = useState(assets)
  const [activeFilter, setActiveFilter] = useState<AssetFilter>('all')
  const { unarchiveAsset, moveToTrash, restoreFromTrash, purgeAsset, isPending } = useAssetMutations()

  const filtered = useMemo(() => {
    if (activeFilter === 'all') {
      return items
    }

    return items.filter((item) => item.type === activeFilter)
  }, [activeFilter, items])

  async function handleUnarchive(item: AssetListItem) {
    const updated = await unarchiveAsset(item.id, item.type)
    if (updated) {
      setItems((current) => current.filter((entry) => entry.id !== updated.id))
    }
  }

  async function handleMoveToTrash(item: AssetListItem) {
    const updated = await moveToTrash(item.id, item.type)
    if (updated) {
      setItems((current) => current.filter((entry) => entry.id !== updated.id))
    }
  }

  async function handleRestore(item: AssetListItem) {
    const updated = await restoreFromTrash(item.id, item.type)
    if (updated) {
      setItems((current) => current.filter((entry) => entry.id !== updated.id))
    }
  }

  async function handlePurge(item: AssetListItem) {
    const confirmed = window.confirm('永久删除后将无法恢复，确定继续吗？')
    if (!confirmed) {
      return
    }

    const deleted = await purgeAsset(item.id, item.type)
    if (deleted) {
      setItems((current) => current.filter((entry) => entry.id !== deleted.id))
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight mb-3 font-[family-name:var(--font-manrope)]">
          {mode === 'archive' ? '归档' : '回收站'}
        </h1>

        <div className="flex gap-4 border-b border-outline-variant/10 overflow-x-auto">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`pb-3 text-sm font-medium whitespace-nowrap ${
                activeFilter === filter.key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState mode={mode} />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const pending =
              isPending(item.id, 'unarchive') ||
              isPending(item.id, 'trash') ||
              isPending(item.id, 'restore') ||
              isPending(item.id, 'purge')

            return (
              <div
                key={item.id}
                className="group flex items-center justify-between rounded-lg border border-outline-variant/10 bg-surface-container-lowest px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-sm bg-primary/10 text-primary">
                      {typeLabel(item.type)}
                    </span>
                    <span className="text-xs text-on-surface-variant/60">
                      {formatAssetRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-on-surface truncate">{item.title}</p>
                  <p className="text-xs text-on-surface-variant line-clamp-1 mt-1">{item.excerpt}</p>
                </div>

                <AssetActionMenu
                  actions={
                    mode === 'archive'
                      ? [
                          {
                            label: '取消归档',
                            onClick: () => handleUnarchive(item),
                            disabled: pending,
                          },
                          {
                            label: '移入回收站',
                            onClick: () => handleMoveToTrash(item),
                            disabled: pending,
                            danger: true,
                          },
                        ]
                      : [
                          {
                            label: '恢复',
                            onClick: () => handleRestore(item),
                            disabled: pending,
                          },
                          {
                            label: '永久删除',
                            onClick: () => handlePurge(item),
                            disabled: pending,
                            danger: true,
                          },
                        ]
                  }
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
