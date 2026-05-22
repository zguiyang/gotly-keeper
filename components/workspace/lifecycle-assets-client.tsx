'use client'

import { useTranslations } from '@/hooks/use-locale'

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
import { assetTypePresentation, getAssetLocaleKey } from '@/config/ui/asset-presentation'
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
  { key: 'all', label: 'All', },
  { key: 'note', label: 'Note', },
  { key: 'todo', label: 'Todo', },
  { key: 'link', label: 'Bookmark', },
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
    eyebrow: 'Archived',
    title: 'Archive',
    description: "Archive items that don't need to be on your workspace. Context and restore entry are preserved.",
    emptyTitle: 'No archived items',
    emptyDescription: "When an item is worth keeping but shouldn't interrupt your flow, archive it.",
    emptyFilteredDescription: 'No archived items of this type. Switch to "All" to browse other archived content.',
    lifecycleLabel: 'archivedAt',
    statusClassName: 'border-border/22 bg-muted/55 text-on-surface-variant',
    countLabel: 'Neat Storage',
    Icon: Archive,
  },
  trash: {
    eyebrow: 'Pending',
    title: 'Trash',
    description: 'Recently removed items live here. Restore if still valuable, or permanently delete.',
    emptyTitle: 'Trash is empty',
    emptyDescription: 'No items to clean up. The workspace stays tidy.',
    emptyFilteredDescription: 'No items of this type in trash. Switch to "All" to see other trashed items.',
    lifecycleLabel: 'removedAt',
    statusClassName: 'border-destructive/24 bg-destructive/10 text-destructive',
    countLabel: 'Awaiting Confirmation',
    notice: 'Permanent deletion cannot be undone.',
    Icon: Trash2,
  },
}

function typeLabel(type: AssetListItem['type']): string {
  if (type === 'note') return 'Note'
  if (type === 'todo') return 'Todo'
  return 'Bookmark'
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
          ? 'border-destructive/22 bg-destructive/[0.035] py-5 sm:py-6'
          : 'border-border/22 bg-surface-container-lowest/90 py-7 sm:py-8'
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
  const t = useTranslations('workspace.lifecycle')
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
        {t('permanentDelete')}
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Confirm permanent delete</DialogTitle>
          <DialogDescription>
            Deletion cannot be undone, {asset.title} will be permanently removed from the system.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
          <Button type="button" variant="destructive" disabled={submitting} onClick={() => void handleConfirm()}>
            {submitting ? t('deleting') : t('permanentDelete')}
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
  const t = useTranslations('workspace.lifecycle')
  const content = MODE_CONTENT[mode]
  const lifecycleDate = getLifecycleDate(item, mode)
  const secondaryTime = lifecycleDate ?? item.createdAt
  const isCompletedTodo = item.type === 'todo' && item.completed

  return (
    <article
      className={cn(
        mode === 'trash' ? workspaceCriticalSurfaceClassName : workspaceListSurfaceClassName,
        'group overflow-hidden transition-[border-color,box-shadow,background-color] duration-200',
        mode === 'archive' ? 'hover:shadow-[var(--shadow-elevation-1)]' : 'hover:bg-destructive/[0.06]'
      )}
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between md:gap-5">
        <div className="flex min-w-0 flex-1 gap-3.5 sm:gap-4">
          <TypeIcon type={item.type} />

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2.5">
              <WorkspaceTypeBadge label={typeLabel(item.type)} variant={typeBadgeVariant(item.type)} />
              {isCompletedTodo ? <span className={workspacePillClassName}>Completed</span> : null}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                  content.statusClassName
                )}
              >
                <Clock3 className="size-3" />
                {t(content.lifecycleLabel)} {formatAssetRelativeTime(secondaryTime)}
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
              <span>Created {formatAssetRelativeTime(item.createdAt)}</span>
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
              {t('unarchive')}
            </Button>
            <AssetActionMenu
              ariaLabel={`More actions: ${item.title}`}
              actions={[
                {
                  label: t('moveToTrash'),
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
              {t('restore')}
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
  const t = useTranslations('workspace.lifecycle')
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
                  mode === 'trash' ? 'bg-destructive/10 text-destructive' : 'bg-primary/12 text-primary'
                )}
                aria-hidden="true"
              >
                <SummaryIcon className="size-3.5" />
              </span>
              <span>
                {content.countLabel}: Loaded  {items.length}  items
                {pageInfo.hasNextPage ? t('moreToLoad') : t('allLoaded')}
              </span>
            </p>
            {content.notice ? (
              <p className="inline-flex items-start gap-2 rounded-xl border border-destructive/24 bg-destructive/8 px-3 py-2 text-[12px] leading-5 text-destructive">
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
            {pageInfo.hasNextPage ? (loadingMore ? t('loading') : t('loadMore')) : t('allLoaded')}
          </Button>
        </div>
      ) : null}
      </div>
    </div>
  )
}
