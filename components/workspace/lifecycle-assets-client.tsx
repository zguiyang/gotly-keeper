'use client'

import { AlertTriangle, Archive, ArchiveRestore, Clock3, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import {
  WorkspaceEmptyState,
  WorkspaceFilterTabs,
  WorkspacePageHeader,
  workspacePillClassName,
  workspaceCriticalSurfaceClassName,
  workspaceListSurfaceClassName,
  workspacePanelSurfaceClassName,
  WorkspaceTypeBadge,
} from '@/components/workspace/workspace-view-primitives'
import { assetTypePresentation } from '@/config/ui/asset-presentation'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { useWorkspaceAssetsPage } from '@/hooks/workspace/use-workspace-assets-page'
import { cn } from '@/lib/utils'
import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'
import { formatAssetRelativeTime } from '@/shared/assets/asset-time-display'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { PaginatedResult } from '@/shared/pagination'
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
  statusClassName: string
  countLabel: string
  notice?: string
  Icon: LucideIcon
}

const MODE_CONTENT: Record<LifecycleViewMode, LifecycleModeContent> = {
  archive: {
    eyebrow: '已收起',
    title: '归档',
    description: '把暂时不需要出现在工作台里的内容收起来，保留上下文、来源和恢复入口。',
    emptyTitle: '暂无归档内容',
    emptyDescription: '当一条内容还值得保留、但不该继续打扰当前工作时，可以先归档。',
    emptyFilteredDescription: '这个类型暂时没有归档内容。切换到「全部」可以查看其他已收起的内容。',
    lifecycleLabel: '归档于',
    statusClassName: 'border-border/10 bg-muted/30 text-on-surface-variant/75',
    countLabel: '安静收纳',
    Icon: Archive,
  },
  trash: {
    eyebrow: '待确认',
    title: '回收站',
    description: '这里保留最近移除的内容。确认仍有价值就恢复，确认不再需要再永久删除。',
    emptyTitle: '回收站为空',
    emptyDescription: '没有待清理内容，工作区保持干净。',
    emptyFilteredDescription: '这个类型暂时没有待清理内容。切换到「全部」可以查看其它回收站项目。',
    lifecycleLabel: '移除于',
    statusClassName: 'border-destructive/15 bg-destructive/6 text-destructive',
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
      className={cn(
        'mt-8',
        mode === 'trash'
          ? 'border-destructive/12 bg-destructive/[0.02] py-5 sm:py-6'
          : 'border-border/16 bg-surface-container-lowest/85 py-7 sm:py-8'
      )}
    />
  )
}

function PurgeAssetDialog({
  asset,
  disabled,
  className,
  onConfirm,
}: {
  asset: AssetListItem
  disabled: boolean
  className?: string
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="destructive" size="sm" className={cn('rounded-full', className)} />}
        disabled={disabled || submitting}
      >
        永久删除
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>确认永久删除</DialogTitle>
          <DialogDescription>
            删除后无法恢复，{asset.title} 将从系统中彻底移除。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>取消</DialogClose>
          <Button type="button" variant="destructive" disabled={submitting} onClick={() => void handleConfirm()}>
            {submitting ? '删除中...' : '永久删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        mode === 'trash' ? workspaceCriticalSurfaceClassName : workspaceListSurfaceClassName,
        'group overflow-hidden transition-[border-color,box-shadow,background-color] duration-200',
        mode === 'archive' ? 'hover:shadow-[var(--shadow-elevation-1)]' : 'hover:bg-destructive/[0.05]'
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
          <div className="flex shrink-0 flex-col items-stretch gap-2 md:items-end md:pt-1">
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={pending}
              className="rounded-full shadow-none"
              onClick={() => onRestore(item)}
            >
              <ArchiveRestore className="size-3.5" />
              恢复
            </Button>
            <PurgeAssetDialog asset={item} disabled={pending} onConfirm={onPurge} className="w-full justify-center" />
          </div>
        )}
      </div>
    </article>
  )
}

export function LifecycleAssetsClient({
  initialPage,
  mode,
}: {
  initialPage: PaginatedResult<AssetListItem>
  mode: LifecycleViewMode
}) {
  const lifecycleStatus =
    mode === 'archive' ? ASSET_LIFECYCLE_STATUS.ARCHIVED : ASSET_LIFECYCLE_STATUS.TRASHED
  const { items, setItems, pageInfo, loadingMore, refreshing, loadFirstPage, loadMore } =
    useWorkspaceAssetsPage({
      initialPage,
      initialQuery: { lifecycleStatus },
    })
  const [activeFilter, setActiveFilter] = useState<AssetFilter>('all')
  const { unarchiveAsset, moveToTrash, restoreFromTrash, purgeAsset, isPending } = useAssetMutations()
  const content = MODE_CONTENT[mode]
  const SummaryIcon = content.Icon

  const filtered = items

  async function handleFilterChange(nextFilter: string) {
    const type = nextFilter === 'all' ? undefined : (nextFilter as AssetListItem['type'])
    setActiveFilter(nextFilter as AssetFilter)
    await loadFirstPage({ type, lifecycleStatus })
  }

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

        <div
          className={cn(
            workspacePanelSurfaceClassName,
            'flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between'
          )}
        >
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
                {content.countLabel}：已加载 {items.length} 条
                {pageInfo.hasNextPage ? '，还有更多' : '，已加载全部'}
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
            onValueChange={(value) => void handleFilterChange(value)}
            className="border-b-0 pb-0"
          />
        </div>
      </section>

      <div className={refreshing ? 'opacity-60' : ''}>
      {filtered.length === 0 ? (
        <EmptyState mode={mode} isFiltered={activeFilter !== 'all'} />
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

      {filtered.length > 0 ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={!pageInfo.hasNextPage || loadingMore || refreshing}
            onClick={() => void loadMore()}
          >
            {pageInfo.hasNextPage ? (loadingMore ? '加载中...' : '加载更多') : '已加载全部'}
          </Button>
        </div>
      ) : null}
      </div>
    </div>
  )
}
