'use client'

import { useState } from 'react'

import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { assetTypePresentation } from '@/config/ui/asset-presentation'
import { filterTabs, emptyFilterMessages } from '@/config/workspace/filters'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import {
  getAssetDateGroup,
  formatAssetRelativeTime,
} from '@/shared/assets/asset-time-display'
import { type AssetListItem } from '@/shared/assets/assets.types'

type AssetType = 'note' | 'link' | 'todo'

const typeLabels: Record<AssetType, string> = {
  note: '笔记',
  link: '书签',
  todo: '待办',
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center py-6">
      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mr-4">
        {label}
      </span>
      <div className="flex-1 h-px bg-outline-variant/10" />
    </div>
  )
}

function TypePill({ type }: { type: AssetType }) {
  const colors = {
    note: 'bg-primary/10 text-primary',
    link: 'bg-secondary/10 text-secondary',
    todo: 'bg-tertiary/10 text-tertiary',
  }
  return (
    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-medium ${colors[type]}`}>
      {typeLabels[type]}
    </span>
  )
}

function AssetItem({
  asset,
  onEdit,
  onArchive,
  onMoveToTrash,
}: {
  asset: AssetListItem
  onEdit: (asset: AssetListItem) => void
  onArchive: (asset: AssetListItem) => void
  onMoveToTrash: (asset: AssetListItem) => void
}) {
  const presentation = assetTypePresentation[asset.type]
  const Icon = presentation.icon

  return (
    <div className="group flex items-center py-5 hover:bg-surface-container-low/50 px-4 -mx-4 rounded-sm transition-all cursor-pointer">
      <div
        className={`w-10 h-10 flex-shrink-0 rounded-sm flex items-center justify-center mr-6 ${presentation.iconBg}`}
      >
        <Icon className={`w-5 h-5 ${presentation.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h3
            className={`text-sm font-medium truncate ${
              asset.completed
                ? 'text-on-surface-variant line-through'
                : 'text-on-surface group-hover:text-primary transition-colors'
            }`}
          >
            {asset.title}
          </h3>
          <TypePill type={asset.type} />
          {asset.completed && (
            <span className="px-2 py-0.5 rounded-sm bg-surface-container-high text-[10px] font-medium text-on-surface-variant">
              已完成
            </span>
          )}
        </div>
        <p
          className={`text-xs line-clamp-1 ${
            asset.completed ? 'text-on-surface-variant/60' : 'text-on-surface-variant'
          }`}
        >
          {asset.excerpt}
        </p>
      </div>
      <div className="ml-4 lg:ml-8 text-right flex-shrink-0">
        <span className="text-xs font-medium text-on-surface-variant/60">
          {asset.timeText || formatAssetRelativeTime(asset.createdAt)}
        </span>
      </div>
      <div className="ml-2 lg:ml-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
        <AssetActionMenu
          actions={[
            { label: '编辑', onClick: () => onEdit(asset) },
            { label: '归档', onClick: () => onArchive(asset) },
            { label: '移入回收站', onClick: () => onMoveToTrash(asset), danger: true },
          ]}
        />
      </div>
    </div>
  )
}

export function AllClient({ assets }: { assets: AssetListItem[] }) {
  const [items, setItems] = useState(assets)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const { updateAsset, archiveAsset, moveToTrash } = useAssetMutations()

  const filteredAssets =
    activeFilter === 'all'
      ? items
      : items.filter((asset) => asset.type === activeFilter)

  const todayAssets = filteredAssets.filter((asset) => getAssetDateGroup(asset.createdAt) === 'today')
  const yesterdayAssets = filteredAssets.filter((asset) => getAssetDateGroup(asset.createdAt) === 'yesterday')
  const olderAssets = filteredAssets.filter((asset) => getAssetDateGroup(asset.createdAt) === 'older')

  const hasAnyAssets = filteredAssets.length > 0

  async function handleEdit(asset: AssetListItem) {
    const text = window.prompt('编辑内容', asset.originalText)
    if (!text || !text.trim()) {
      return
    }

    if (asset.type === 'note') {
      const updated = await updateAsset({
        assetId: asset.id,
        assetType: 'note',
        text: text.trim(),
      })
      if (updated) {
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      }
      return
    }

    if (asset.type === 'todo') {
      const updated = await updateAsset({
        assetId: asset.id,
        assetType: 'todo',
        text: text.trim(),
        timeText: asset.timeText,
        dueAt: asset.dueAt,
      })
      if (updated) {
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      }
      return
    }

    const url = window.prompt('编辑链接 URL', asset.url ?? '')
    if (!url || !url.trim()) {
      return
    }

    const updated = await updateAsset({
      assetId: asset.id,
      assetType: 'link',
      text: text.trim(),
      url: url.trim(),
    })
    if (updated) {
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    }
  }

  async function handleArchive(asset: AssetListItem) {
    const updated = await archiveAsset(asset.id, asset.type)
    if (updated) {
      setItems((current) => current.filter((item) => item.id !== updated.id))
    }
  }

  async function handleMoveToTrash(asset: AssetListItem) {
    const updated = await moveToTrash(asset.id, asset.type)
    if (updated) {
      setItems((current) => current.filter((item) => item.id !== updated.id))
    }
  }

  return (
    <>
      <div className="mb-10">
        <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight mb-6 font-[family-name:var(--font-manrope)]">
          知识库
        </h1>
        <div className="flex gap-6 border-b border-outline-variant/10 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeFilter === tab.key
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
              {activeFilter === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl">
        {todayAssets.length > 0 && (
          <>
            <DateDivider label="今天" />
            {todayAssets.map((asset) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onMoveToTrash={handleMoveToTrash}
              />
            ))}
          </>
        )}

        {yesterdayAssets.length > 0 && (
          <>
            <DateDivider label="昨天" />
            {yesterdayAssets.map((asset) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onMoveToTrash={handleMoveToTrash}
              />
            ))}
          </>
        )}

        {olderAssets.length > 0 && (
          <>
            <DateDivider label="更早" />
            {olderAssets.map((asset) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onMoveToTrash={handleMoveToTrash}
              />
            ))}
          </>
        )}

        {!hasAnyAssets && (
          <div className="mt-20 text-center py-12 border-2 border-dashed border-outline-variant/10 rounded-lg">
            <p className="text-sm text-on-surface-variant font-medium">
              {emptyFilterMessages[activeFilter] ?? emptyFilterMessages.all}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
