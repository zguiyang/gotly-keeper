'use client'

import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import {
  WorkspaceEmptyState,
  WorkspaceFilterTabs,
  workspaceMetaTextClassName,
  WorkspacePageHeader,
  workspaceSurfaceClassName,
  WorkspaceTypeBadge,
} from '@/components/workspace/workspace-view-primitives'
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
    <WorkspaceEmptyState
      title={mode === 'archive' ? '暂无归档内容' : '回收站为空'}
      description={
        mode === 'archive'
          ? '归档内容默认不会出现在普通列表中。'
          : '已删除内容可在这里恢复，或永久删除。'
      }
    />
  )
}

function PurgeAssetDialog({
  asset,
  disabled,
  onConfirm,
}: {
  asset: AssetListItem
  disabled: boolean
  onConfirm: (asset: AssetListItem) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm() {
    if (submitting) {
      return
    }

    setSubmitting(true)
    try {
      await onConfirm(asset)
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <AlertDialogPrimitive.Trigger
        data-slot="purge-dialog-trigger"
        render={
          <button
            type="button"
            className="w-full rounded-sm px-3 py-2 text-left text-xs text-error transition-colors hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          />
        }
        disabled={disabled || submitting}
      >
        永久删除
      </AlertDialogPrimitive.Trigger>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/10 backdrop-blur-xs" />
        <AlertDialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <AlertDialogPrimitive.Popup className="grid w-full max-w-xs gap-4 rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-sm">
            <div className="grid gap-1.5 text-center sm:text-left">
              <AlertDialogPrimitive.Title className="font-heading text-base font-medium">
                确认永久删除
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="text-sm text-muted-foreground">
                删除后无法恢复，{asset.title} 将从系统中彻底移除。
              </AlertDialogPrimitive.Description>
            </div>
            <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
              <AlertDialogPrimitive.Close render={<Button variant="outline" />}>
                取消
              </AlertDialogPrimitive.Close>
              <Button variant="destructive" disabled={submitting} onClick={() => void handleConfirm()}>
                {submitting ? '删除中…' : '永久删除'}
              </Button>
            </div>
          </AlertDialogPrimitive.Popup>
        </AlertDialogPrimitive.Viewport>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
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
    const deleted = await purgeAsset(item.id, item.type)
    if (deleted) {
      setItems((current) => current.filter((entry) => entry.id !== deleted.id))
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <WorkspacePageHeader
          title={mode === 'archive' ? '归档' : '回收站'}
          description={
            mode === 'archive'
              ? '先收起暂时不需要打扰你的内容，保留一份整洁的工作台。'
              : '回收站保留最近移除的内容，你可以恢复或彻底删除。'
          }
        />
        <WorkspaceFilterTabs tabs={FILTERS} value={activeFilter} onValueChange={setActiveFilter} />
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
                className={`${workspaceSurfaceClassName} group flex items-center justify-between px-5 py-4`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2.5">
                    <WorkspaceTypeBadge label={typeLabel(item.type)} variant="default" />
                    <span className={workspaceMetaTextClassName}>
                      {formatAssetRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="truncate text-[17px] font-semibold leading-7 tracking-[-0.02em] text-on-surface">{item.title}</p>
                  <p className="mt-1 line-clamp-1 text-sm leading-6 text-on-surface-variant">{item.excerpt}</p>
                </div>

                {mode === 'archive' ? (
                  <AssetActionMenu
                    actions={[
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
                    ]}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <AssetActionMenu
                      actions={[
                        {
                          label: '恢复',
                          onClick: () => handleRestore(item),
                          disabled: pending,
                        },
                      ]}
                    />
                    <PurgeAssetDialog asset={item} disabled={pending} onConfirm={handlePurge} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
