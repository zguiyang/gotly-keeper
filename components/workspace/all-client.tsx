'use client'

import { useState } from 'react'

import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog } from '@/components/workspace/asset-edit-dialog'
import {
  WorkspaceEmptyState,
  WorkspaceFilterTabs,
  workspaceMetaTextClassName,
  WorkspacePageHeader,
  workspacePillClassName,
  WorkspaceSectionDivider,
  WorkspaceTypeBadge,
} from '@/components/workspace/workspace-view-primitives'
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

function TypePill({ type }: { type: AssetType }) {
  const variants: Record<AssetType, 'default' | 'secondary' | 'outline'> = {
    note: 'default',
    link: 'secondary',
    todo: 'outline',
  }

  return (
    <WorkspaceTypeBadge label={typeLabels[type]} variant={variants[type]} />
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
  const actions = [
    { label: '编辑', onClick: () => onEdit(asset) },
    { label: '归档', onClick: () => onArchive(asset) },
    { label: '移入回收站', onClick: () => onMoveToTrash(asset), danger: true },
  ]

  return (
    <article className="group -mx-4 rounded-2xl px-4 py-5 transition-colors duration-150 hover:bg-surface-container-low/45">
      <div className="flex items-start gap-4 lg:gap-5">
        <div
          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${presentation.iconBg}`}
        >
          <Icon className={`h-[18px] w-[18px] ${presentation.iconColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <TypePill type={asset.type} />
            {asset.completed && <span className={workspacePillClassName}>已完成</span>}
            <span className={`${workspaceMetaTextClassName} lg:hidden`}>
              {asset.timeText || formatAssetRelativeTime(asset.createdAt)}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3
                className={`text-[17px] font-semibold leading-7 tracking-[-0.02em] ${
                  asset.completed
                    ? 'text-on-surface-variant line-through'
                    : 'text-on-surface group-hover:text-primary transition-colors'
                }`}
              >
                {asset.title}
              </h3>

              <p
                className={`mt-1 max-w-3xl text-sm leading-6 ${
                  asset.completed ? 'text-on-surface-variant/65' : 'text-on-surface-variant'
                }`}
              >
                {asset.excerpt}
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-3 lg:flex">
              <span className={`${workspaceMetaTextClassName} min-w-[78px] text-right`}>
                {asset.timeText || formatAssetRelativeTime(asset.createdAt)}
              </span>
              <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <AssetActionMenu actions={actions} />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-0.5 lg:hidden">
          <AssetActionMenu actions={actions} />
        </div>
      </div>
    </article>
  )
}

export function AllClient({ assets }: { assets: AssetListItem[] }) {
  const [items, setItems] = useState(assets)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [editingAsset, setEditingAsset] = useState<AssetListItem | null>(null)
  const { updateAsset, archiveAsset, moveToTrash } = useAssetMutations()

  const filteredAssets =
    activeFilter === 'all'
      ? items
      : items.filter((asset) => asset.type === activeFilter)

  const todayAssets = filteredAssets.filter((asset) => getAssetDateGroup(asset.createdAt) === 'today')
  const yesterdayAssets = filteredAssets.filter((asset) => getAssetDateGroup(asset.createdAt) === 'yesterday')
  const olderAssets = filteredAssets.filter((asset) => getAssetDateGroup(asset.createdAt) === 'older')

  const hasAnyAssets = filteredAssets.length > 0

  async function submitEdit(asset: AssetListItem, values: { text: string; url?: string }) {
    if (asset.type === 'note') {
      const updated = await updateAsset({
        assetId: asset.id,
        assetType: 'note',
        text: values.text,
      })
      if (updated) {
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      }
      return !!updated
    }

    if (asset.type === 'todo') {
      const updated = await updateAsset({
        assetId: asset.id,
        assetType: 'todo',
        text: values.text,
        timeText: asset.timeText,
        dueAt: asset.dueAt,
      })
      if (updated) {
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      }
      return !!updated
    }

    const updated = await updateAsset({
      assetId: asset.id,
      assetType: 'link',
      text: values.text,
      url: values.url ?? '',
    })
    if (updated) {
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    }
    return !!updated
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
        <WorkspacePageHeader
          title="知识库"
          description="按同一套线索浏览最近捕获的笔记、书签和待办，快速找到该看的那一条。"
        />
        <WorkspaceFilterTabs tabs={filterTabs} value={activeFilter} onValueChange={setActiveFilter} />
      </div>

      <div className="max-w-6xl">
        {todayAssets.length > 0 && (
          <>
            <WorkspaceSectionDivider label="今天" />
            {todayAssets.map((asset) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                onEdit={setEditingAsset}
                onArchive={handleArchive}
                onMoveToTrash={handleMoveToTrash}
              />
            ))}
          </>
        )}

        {yesterdayAssets.length > 0 && (
          <>
            <WorkspaceSectionDivider label="昨天" />
            {yesterdayAssets.map((asset) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                onEdit={setEditingAsset}
                onArchive={handleArchive}
                onMoveToTrash={handleMoveToTrash}
              />
            ))}
          </>
        )}

        {olderAssets.length > 0 && (
          <>
            <WorkspaceSectionDivider label="更早" />
            {olderAssets.map((asset) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                onEdit={setEditingAsset}
                onArchive={handleArchive}
                onMoveToTrash={handleMoveToTrash}
              />
            ))}
          </>
        )}

        {!hasAnyAssets && (
          <WorkspaceEmptyState title={emptyFilterMessages[activeFilter] ?? emptyFilterMessages.all} />
        )}
      </div>

      <AssetEditDialog
        asset={editingAsset}
        onOpenChange={(open) => {
          if (!open) setEditingAsset(null)
        }}
        onSubmit={submitEdit}
      />
    </>
  )
}
