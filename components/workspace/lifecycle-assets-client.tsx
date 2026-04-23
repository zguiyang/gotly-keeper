'use client'

import { AlertTriangle, Archive, ArchiveRestore, Clock3, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import {
  WorkspaceEmptyState,
  WorkspaceFilterTabs,
  WorkspacePageHeader,
  workspacePillClassName,
  workspaceSurfaceClassName,
  WorkspaceTypeBadge,
} from '@/components/workspace/workspace-view-primitives'
import { assetTypePresentation } from '@/config/ui/asset-presentation'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { cn } from '@/lib/utils'
import { formatAssetRelativeTime } from '@/shared/assets/asset-time-display'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { LucideIcon } from 'lucide-react'

type AssetFilter = 'all' | 'note' | 'todo' | 'link'
type LifecycleViewMode = 'archive' | 'trash'

const FILTERS: Array<{ key: AssetFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'note', label: '笔记' },
  { key: 'todo', label: '待办' },
  { key: 'link', label: '书签' },
]

type LifecycleModeContent = {
  eyebrow: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  emptyFilteredDescription: string
  lifecycleLabel: string
  surfaceClassName: string
  statusClassName: string
  countLabel: string
  notice?: string
  Icon: LucideIcon
}

const MODE_CONTENT: Record<LifecycleViewMode, LifecycleModeContent> = {
  archive: {
    eyebrow: 'Quiet Layer',
    title: '归档',
    description: '把暂时不需要出现在工作台里的内容收起来，但保留它们的上下文、来源与可恢复入口。',
    emptyTitle: '暂无归档内容',
    emptyDescription: '当一条内容还值得保留、但不该继续打扰当前工作时，可以先归档。',
    emptyFilteredDescription: '这个类型暂时没有归档内容。切换到「全部」可以查看其它已收起的内容。',
    lifecycleLabel: '归档于',
    surfaceClassName:
      'border-border/15 bg-surface-container-lowest hover:border-border/28 hover:shadow-[var(--shadow-elevation-1)]',
    statusClassName: 'border-border/10 bg-muted/35 text-on-surface-variant/80',
    countLabel: '安静保存',
    Icon: Archive,
  },
  trash: {
    eyebrow: 'Removal Review',
    title: '回收站',
    description: '这里保留最近移除的内容。确认仍有价值就恢复；确认不再需要再永久删除。',
    emptyTitle: '回收站为空',
    emptyDescription: '没有待清理内容，工作区保持干净。',
    emptyFilteredDescription: '这个类型暂时没有待清理内容。切换到「全部」可以查看其它回收站项目。',
    lifecycleLabel: '移除于',
    surfaceClassName:
      'border-destructive/18 bg-destructive/[0.025] hover:border-destructive/28 hover:shadow-[0_12px_28px_-22px_rgba(186,26,26,0.42)]',
    statusClassName: 'border-destructive/15 bg-destructive/7 text-destructive',
    countLabel: '等待确认',
    notice: '永久删除后无法恢复。建议先确认内容已经不再需要。',
    Icon: Trash2,
  },
}

function typeLabel(type: AssetListItem['type']): string {
  if (type === 'note') return '笔记'
  if (type === 'todo') return '待办'
  return '书签'
}

function typeBadgeVariant(type: AssetListItem['type']): 'default' | 'secondary' | 'outline' {
  if (type === 'note') return 'default'
  if (type === 'link') return 'secondary'
  return 'outline'
}

function getLifecycleDate(item: AssetListItem, mode: LifecycleViewMode) {
  return mode === 'archive' ? item.archivedAt : item.trashedAt
}

function TypeIcon({ type }: { type: AssetListItem['type'] }) {
  const presentation = assetTypePresentation[type]
  const Icon = presentation.icon

  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/10',
        presentation.iconBg
      )}
      aria-hidden="true"
    >
      <Icon className={cn('size-[18px]', presentation.iconColor)} />
    </span>
  )
}

function EmptyState({
  mode,
  isFiltered,
}: {
  mode: LifecycleViewMode
  isFiltered: boolean
}) {
  const content = MODE_CONTENT[mode]

  return (
    <WorkspaceEmptyState
      title={content.emptyTitle}
      description={isFiltered ? content.emptyFilteredDescription : content.emptyDescription}
      icon={content.Icon}
      className="mt-8 border-border/18 bg-surface-container-lowest/85"
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="destructive" size="sm" className="rounded-full" />}
        disabled={disabled || submitting}
      >
        永久删除
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认永久删除</AlertDialogTitle>
          <AlertDialogDescription>
            删除后无法恢复，{asset.title} 将从系统中彻底移除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={submitting} onClick={() => void handleConfirm()}>
            {submitting ? '删除中...' : '永久删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function LifecycleAssetItem({
  item,
  mode,
  pending,
  onUnarchive,
  onMoveToTrash,
  onRestore,
  onPurge,
}: {
  item: AssetListItem
  mode: LifecycleViewMode
  pending: boolean
  onUnarchive: (item: AssetListItem) => void
  onMoveToTrash: (item: AssetListItem) => void
  onRestore: (item: AssetListItem) => void
  onPurge: (item: AssetListItem) => Promise<void>
}) {
  const content = MODE_CONTENT[mode]
  const lifecycleDate = getLifecycleDate(item, mode)
  const secondaryTime = lifecycleDate ?? item.createdAt
  const isCompletedTodo = item.type === 'todo' && item.completed

  return (
    <article
      className={cn(
        workspaceSurfaceClassName,
        'group overflow-hidden rounded-2xl transition-[border-color,box-shadow,background-color] duration-200',
        content.surfaceClassName
      )}
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between md:gap-5">
        <div className="flex min-w-0 flex-1 gap-3.5 sm:gap-4">
          <TypeIcon type={item.type} />

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2.5">
              <WorkspaceTypeBadge label={typeLabel(item.type)} variant={typeBadgeVariant(item.type)} />
              {isCompletedTodo ? <span className={workspacePillClassName}>已完成</span> : null}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                  content.statusClassName
                )}
              >
                <Clock3 className="size-3" />
                {content.lifecycleLabel} {formatAssetRelativeTime(secondaryTime)}
              </span>
            </div>

            <h3
              className={cn(
                'font-headline text-[1.03rem] font-semibold leading-7 tracking-normal text-on-surface transition-colors duration-150 group-hover:text-primary sm:text-[1.12rem]',
                isCompletedTodo && 'text-on-surface-variant line-through decoration-on-surface-variant/45'
              )}
            >
              {item.title}
            </h3>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-on-surface-variant line-clamp-2">
              {item.excerpt}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-on-surface-variant/75">
              <span>创建于 {formatAssetRelativeTime(item.createdAt)}</span>
              {item.url ? (
                <>
                  <span className="size-1 rounded-full bg-border/40" aria-hidden="true" />
                  <span className="max-w-[18rem] truncate">{item.url.replace(/^https?:\/\//, '')}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {mode === 'archive' ? (
          <div className="flex shrink-0 items-center justify-end gap-2 md:pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              className="rounded-full bg-surface-container-lowest"
              onClick={() => onUnarchive(item)}
            >
              <RotateCcw className="size-3.5" />
              取消归档
            </Button>
            <AssetActionMenu
              actions={[
                {
                  label: '移入回收站',
                  onClick: () => onMoveToTrash(item),
                  disabled: pending,
                  danger: true,
                },
              ]}
            />
          </div>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 md:pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              className="rounded-full bg-surface-container-lowest"
              onClick={() => onRestore(item)}
            >
              <ArchiveRestore className="size-3.5" />
              恢复
            </Button>
            <PurgeAssetDialog asset={item} disabled={pending} onConfirm={onPurge} />
          </div>
        )}
      </div>
    </article>
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
  const content = MODE_CONTENT[mode]
  const SummaryIcon = content.Icon

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
    <div className="mx-auto w-full max-w-6xl px-1 sm:px-2">
      <section className="mb-6 sm:mb-8">
        <WorkspacePageHeader
          title={content.title}
          eyebrow={content.eyebrow}
          description={content.description}
          className="mb-6"
        />

        <div className="flex flex-col gap-4 border-y border-border/10 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full',
                  mode === 'trash' ? 'bg-destructive/8 text-destructive' : 'bg-primary/8 text-primary'
                )}
                aria-hidden="true"
              >
                <SummaryIcon className="size-3.5" />
              </span>
              <span>
                {content.countLabel}：当前显示 {filtered.length} 条，共 {items.length} 条
              </span>
            </p>
            {content.notice ? (
              <p className="inline-flex items-start gap-2 rounded-xl border border-destructive/15 bg-destructive/5 px-3 py-2 text-[12px] leading-5 text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {content.notice}
              </p>
            ) : null}
          </div>
          <WorkspaceFilterTabs
            tabs={FILTERS}
            value={activeFilter}
            onValueChange={setActiveFilter}
            className="border-b-0 pb-0"
          />
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState mode={mode} isFiltered={activeFilter !== 'all' && items.length > 0} />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const pending =
              isPending(item.id, 'unarchive') ||
              isPending(item.id, 'trash') ||
              isPending(item.id, 'restore') ||
              isPending(item.id, 'purge')

            return (
              <LifecycleAssetItem
                key={item.id}
                item={item}
                mode={mode}
                pending={pending}
                onUnarchive={handleUnarchive}
                onMoveToTrash={handleMoveToTrash}
                onRestore={handleRestore}
                onPurge={handlePurge}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
