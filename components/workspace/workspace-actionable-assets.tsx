'use client'

import { Circle, CircleCheck, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog, type AssetEditValues } from '@/components/workspace/asset-edit-dialog'
import { TodoDueTime } from '@/components/workspace/todo-due-time'
import {
  workspaceMetaTextClassName,
  workspacePillClassName,
} from '@/components/workspace/workspace-view-primitives'
import { assetTypePresentation } from '@/config/ui/asset-presentation'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { useTodoCompletion } from '@/hooks/workspace/use-todo-completion'
import { formatAssetRelativeTime } from '@/shared/assets/asset-time-display'
import { formatAbsoluteTime } from '@/shared/time/formatters'

import type { AssetListItem } from '@/shared/assets/assets.types'

function getAssetSupportingText(asset: AssetListItem) {
  if (asset.type === 'todo') {
    return asset.content ?? ''
  }

  if (asset.type === 'link') {
    return asset.note ?? asset.summary ?? ''
  }

  return asset.content ?? asset.summary ?? ''
}

function replaceAsset(items: AssetListItem[], updated: AssetListItem) {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

function ActionableAssetItem({
  asset,
  pending,
  onToggleTodo,
  onEdit,
  onArchive,
  onMoveToTrash,
}: {
  asset: AssetListItem
  pending: boolean
  onToggleTodo: (asset: AssetListItem) => void
  onEdit: (asset: AssetListItem) => void
  onArchive: (asset: AssetListItem) => void
  onMoveToTrash: (asset: AssetListItem) => void
}) {
  const presentation = assetTypePresentation[asset.type]
  const Icon = presentation.icon
  const supportingText = getAssetSupportingText(asset)
  const timeText = asset.timeText || formatAssetRelativeTime(asset.createdAt)

  return (
    <div
      className={`group -mx-3 rounded-lg px-3 py-4 transition-colors duration-150 hover:bg-muted/45 focus-within:bg-muted/45 ${
        asset.completed ? 'opacity-85' : ''
      }`}
    >
      <div className="flex items-start gap-3.5">
        {asset.type === 'todo' ? (
          <Button
            type="button"
            onClick={() => onToggleTodo(asset)}
            disabled={pending}
            variant="ghost"
            size="icon-sm"
            className="mt-0.5 shrink-0 text-on-surface-variant/75 hover:text-primary"
            aria-label={asset.completed ? '标记为未完成' : '标记为已完成'}
            title={asset.completed ? '标记为未完成' : '标记为已完成'}
          >
            {asset.completed ? <CircleCheck className="text-primary" /> : <Circle />}
          </Button>
        ) : (
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${presentation.iconBg}`}
          >
            <Icon className={`h-4 w-4 ${presentation.iconColor}`} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {asset.type === 'link' && asset.url ? (
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 text-[15px] font-semibold leading-6 text-on-surface transition-colors hover:text-primary"
                >
                  <span className="truncate">{asset.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-on-surface-variant/75" />
                </a>
              ) : (
                <h3
                  className={`truncate text-[15px] font-semibold leading-6 ${
                    asset.completed
                      ? 'line-through text-on-surface-variant'
                      : 'text-on-surface'
                  }`}
                >
                  {asset.title}
                </h3>
              )}
            </div>

            <span className={`${workspaceMetaTextClassName} hidden shrink-0 sm:inline`}>
              {formatAbsoluteTime(asset.createdAt)}
            </span>
          </div>

          {supportingText ? (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-on-surface-variant">
              {supportingText}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={workspacePillClassName}>
                {presentation.label}
              </span>
              {asset.type === 'todo' ? (
                <TodoDueTime item={asset} />
              ) : (
                <span className="inline-flex items-center gap-1 text-[12px] text-on-surface-variant/80">
                  {timeText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {asset.type === 'link' && asset.url ? (
                <Button
                  nativeButton={false}
                  render={
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" />
                  }
                  variant="ghost"
                  size="sm"
                  className="text-on-surface-variant hover:text-primary"
                >
                  打开
                  <ExternalLink />
                </Button>
              ) : null}
              <AssetActionMenu
                actions={[
                  { label: '编辑', onClick: () => onEdit(asset), disabled: pending },
                  { label: '归档', onClick: () => onArchive(asset), disabled: pending },
                  {
                    label: '移入回收站',
                    onClick: () => onMoveToTrash(asset),
                    disabled: pending,
                    danger: true,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WorkspaceActionableAssetList({
  assets,
  emptyMessage,
}: {
  assets: AssetListItem[]
  emptyMessage: string
}) {
  const [items, setItems] = useState(assets)
  const [editingAsset, setEditingAsset] = useState<AssetListItem | null>(null)
  const { updateAsset, archiveAsset, moveToTrash, isPending } = useAssetMutations()
  const { state: todoState, toggleCompletion } = useTodoCompletion()

  useEffect(() => {
    setItems(assets)
  }, [assets])

  const pendingIds = useMemo(() => {
    const ids = new Set<string>()

    if (todoState.pendingId) {
      ids.add(todoState.pendingId)
    }

    for (const item of items) {
      if (
        isPending(item.id, 'update') ||
        isPending(item.id, 'archive') ||
        isPending(item.id, 'trash')
      ) {
        ids.add(item.id)
      }
    }

    return ids
  }, [isPending, items, todoState.pendingId])

  async function handleToggleTodo(asset: AssetListItem) {
    const updated = await toggleCompletion(asset.id, !asset.completed)

    if (updated) {
      setItems((current) => replaceAsset(current, updated))
    }
  }

  async function submitEdit(asset: AssetListItem, values: AssetEditValues) {
    let updated: AssetListItem | null = null

    if (asset.type === 'note' && 'content' in values && !('timeText' in values)) {
      updated = await updateAsset({
        assetId: asset.id,
        assetType: 'note',
        rawInput: values.rawInput,
        title: values.title,
        content: values.content,
      })
    }

    if (asset.type === 'todo' && 'content' in values && 'timeText' in values) {
      updated = await updateAsset({
        assetId: asset.id,
        assetType: 'todo',
        rawInput: values.rawInput,
        title: values.title,
        content: values.content,
        timeText: values.timeText,
        dueAt: values.timeText === asset.timeText ? asset.dueAt : null,
      })
    }

    if (asset.type === 'link' && 'note' in values) {
      updated = await updateAsset({
        assetId: asset.id,
        assetType: 'link',
        rawInput: values.rawInput,
        title: values.title,
        note: values.note,
        url: values.url,
      })
    }

    if (updated) {
      setItems((current) => replaceAsset(current, updated))
    }

    return !!updated
  }

  async function handleArchive(asset: AssetListItem) {
    const updated = await archiveAsset(asset.id, asset.type, {
      onUndo: (restored) => {
        setItems((current) =>
          current.some((item) => item.id === restored.id) ? current : [restored, ...current]
        )
      },
    })

    if (updated) {
      setItems((current) => current.filter((item) => item.id !== updated.id))
    }
  }

  async function handleMoveToTrash(asset: AssetListItem) {
    const updated = await moveToTrash(asset.id, asset.type, {
      onUndo: (restored) => {
        setItems((current) =>
          current.some((item) => item.id === restored.id) ? current : [restored, ...current]
        )
      },
    })

    if (updated) {
      setItems((current) => current.filter((item) => item.id !== updated.id))
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-on-surface-variant">{emptyMessage}</p>
  }

  return (
    <>
      <div>
        {items.map((asset, index) => (
          <div key={asset.id}>
            <ActionableAssetItem
              asset={asset}
              pending={pendingIds.has(asset.id)}
              onToggleTodo={handleToggleTodo}
              onEdit={setEditingAsset}
              onArchive={handleArchive}
              onMoveToTrash={handleMoveToTrash}
            />
            {index < items.length - 1 ? <Separator className="mx-3 bg-border/10" /> : null}
          </div>
        ))}
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
