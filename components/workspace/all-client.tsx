'use client'

import { useTranslations } from '@/hooks/use-locale'

import { Archive, ArrowRight, Bookmark, Inbox, ListTodo, NotepadText } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog, type AssetEditValues } from '@/components/workspace/asset-edit-dialog'
import { TodoDueTime } from '@/components/workspace/todo-due-time'
import {
  WorkspaceEmptyState,
  WorkspaceFilterTabs,
  workspaceMetaTextClassName,
  WorkspacePageHeader,
  workspacePillClassName,
  WorkspaceTypeBadge,
} from '@/components/workspace/workspace-view-primitives'
import { assetTypePresentation, getAssetLocaleKey } from '@/config/ui/asset-presentation'
import { filterTabs, emptyFilterMessages } from '@/config/workspace/filters'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { useWorkspaceAssetsPage } from '@/hooks/workspace/use-workspace-assets-page'
import {
  getAssetDateGroup,
  formatAssetRelativeTime,
} from '@/shared/assets/asset-time-display'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { type PaginatedResult } from '@/shared/pagination'

type AssetType = 'note' | 'link' | 'todo'

const typeLabels: Record<AssetType, string> = {
  note: 'Note',
  link: 'Bookmark',
  todo: 'Todo',
}

// Maps internal asset type to locale key (type is "link", locale key is "bookmark")
const ASSET_LOCALE_MAP: Record<AssetType, string> = {
  note: getAssetLocaleKey('note'),
  link: getAssetLocaleKey('link'),
  todo: getAssetLocaleKey('todo'),
}

function TypePill({ type }: { type: AssetType }) {
  const tC = useTranslations('common')
  const variants: Record<AssetType, 'default' | 'secondary' | 'outline'> = {
    note: 'default',
    link: 'secondary',
    todo: 'outline',
  }

  return (
    <WorkspaceTypeBadge label={tC(`assets.${ASSET_LOCALE_MAP[type]}`)} variant={variants[type]} />
  )
}

function ArchiveSummaryBar({
  totalCount,
  assetCounts,
  completedTodoCount,
  hasNextPage,
}: {
  totalCount: number
  assetCounts: Record<AssetType, number>
  completedTodoCount: number
  hasNextPage: boolean
}) {
  const tSummary = useTranslations('common')
  const summaryItems: Array<{ type: AssetType; icon: typeof NotepadText }> = [
    { type: 'note', icon: NotepadText },
    { type: 'link', icon: Bookmark },
    { type: 'todo', icon: ListTodo },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border/20 bg-surface-container-lowest/90 px-4 py-3 shadow-[var(--shadow-elevation-1)] md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-8 w-1 shrink-0 rounded-full bg-primary/55" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-surface">
              Loaded {totalCount} items
              {hasNextPage ? ', more to load' : ', all loaded'}
            </p>
            <p className="text-[11px] text-on-surface-variant/75">
              Timeline grouped by capture time, not todo schedule. Easy for quick review.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {summaryItems.map(({ type, icon: Icon }) => (
            <span key={type} className={workspacePillClassName}>
              <Icon className="mr-1.5 size-3.5" />
              {tSummary(`assets.${ASSET_LOCALE_MAP[type]}`)} {assetCounts[type]}
            </span>
          ))}
          {completedTodoCount > 0 ? <span className={workspacePillClassName}>{tSummary('assets.completed')} {completedTodoCount}</span> : null}
        </div>
      </div>
    </div>
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
  const createdTimeText = formatAssetRelativeTime(asset.createdAt)
  const tA = useTranslations('workspace.all')
  const actions = [
    { label: tA('edit'), onClick: () => onEdit(asset) },
    { label: tA('archive'), onClick: () => onArchive(asset) },
    { label: tA('moveToTrash'), onClick: () => onMoveToTrash(asset), danger: true },
  ]

  return (
    <article className="group relative w-full min-w-0 rounded-[14px] border border-border/18 bg-surface-container-lowest/85 px-3 py-3 transition-[border-color,background-color] duration-200 hover:border-border/28 hover:bg-surface-container-lowest sm:px-4 sm:py-4">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/8 ${presentation.iconBg}`}
        >
          <Icon className={`h-[18px] w-[18px] ${presentation.iconColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h3
                className={`text-[15px] font-semibold leading-7 tracking-normal sm:text-[16px] ${
                  asset.completed
                    ? 'text-on-surface-variant line-through'
                    : 'text-on-surface transition-colors group-hover:text-primary'
                }`}
              >
                {asset.title}
              </h3>

              <p
                className={`mt-1 max-w-3xl text-sm leading-6 ${
                  asset.completed ? 'text-on-surface-variant/80' : 'text-on-surface-variant'
                }`}
              >
                {asset.excerpt}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {asset.type === 'todo' ? (
                  <TodoDueTime item={asset} />
                ) : (
                  <span className={workspaceMetaTextClassName}>{createdTimeText}</span>
                )}
                <TypePill type={asset.type} />
                {asset.completed ? <span className={workspacePillClassName}>Completed</span> : null}
              </div>
            </div>

            <div className="shrink-0 pt-0.5 opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
              <AssetActionMenu actions={actions} ariaLabel={`More actions: ${asset.title}`} />
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function TimelineGroup({
  label,
  hint,
  count,
  assets,
  onEdit,
  onArchive,
  onMoveToTrash,
}: {
  label: string
  hint: string
  count: number
  assets: AssetListItem[]
  onEdit: (asset: AssetListItem) => void
  onArchive: (asset: AssetListItem) => void
  onMoveToTrash: (asset: AssetListItem) => void
}) {
  return (
    <section className="grid w-full min-w-0 gap-3 md:grid-cols-[7rem_minmax(0,1fr)] md:gap-5">
      <div className="relative flex min-w-0 items-center justify-between gap-3 md:block md:pt-1">
        <div className="flex items-center gap-2 md:items-start">
          <span className="relative flex size-3 shrink-0 items-center justify-center">
            <span className="size-2 rounded-full bg-primary/55 ring-4 ring-surface-container-lowest" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface">{label}</p>
            <p className="text-[11px] text-on-surface-variant/75">{hint}</p>
          </div>
        </div>
        <span className={workspacePillClassName}>{count}</span>
        <span className="hidden md:block md:absolute md:left-[0.35rem] md:top-7 md:h-full md:w-px md:bg-border/10" />
      </div>

      <div className="min-w-0 space-y-2">
        {assets.map((asset) => (
          <AssetItem
            key={asset.id}
            asset={asset}
            onEdit={onEdit}
            onArchive={onArchive}
            onMoveToTrash={onMoveToTrash}
          />
        ))}
      </div>
    </section>
  )
}

export function AllClient({ initialPage }: { initialPage: PaginatedResult<AssetListItem> }) {
  const t = useTranslations('workspace.all')
  const tF = useTranslations('workspace.filters')
  const { items, setItems, pageInfo, loadingMore, refreshing, loadFirstPage, loadMore } =
    useWorkspaceAssetsPage({ initialPage })
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [editingAsset, setEditingAsset] = useState<AssetListItem | null>(null)
  const { updateAsset, archiveAsset, moveToTrash } = useAssetMutations()

  const filteredAssets = items

  const todayAssets = filteredAssets.filter((asset) => getAssetDateGroup(asset.createdAt) === 'today')
  const yesterdayAssets = filteredAssets.filter((asset) => getAssetDateGroup(asset.createdAt) === 'yesterday')
  const olderAssets = filteredAssets.filter((asset) => getAssetDateGroup(asset.createdAt) === 'older')

  const hasAnyAssets = filteredAssets.length > 0
  const assetCounts = {
    note: items.filter((asset) => asset.type === 'note').length,
    link: items.filter((asset) => asset.type === 'link').length,
    todo: items.filter((asset) => asset.type === 'todo').length,
  } satisfies Record<AssetType, number>
  const completedTodoCount = items.filter((asset) => asset.type === 'todo' && asset.completed).length
  const totalCount = items.length
  const timelineGroups = [
    { key: 'today', label: t('todayCapture'), hint: t('todayCapture'), assets: todayAssets },
    { key: 'yesterday', label: t('yesterdayCapture'), hint: t('yesterdayCapture'), assets: yesterdayAssets },
    { key: 'older', label: t('olderCapture'), hint: t('olderCapture'), assets: olderAssets },
  ].filter((group) => group.assets.length > 0)

  async function handleFilterChange(nextFilter: string) {
    const type = nextFilter === 'all' ? undefined : (nextFilter as AssetType)
    setActiveFilter(nextFilter)
    await loadFirstPage({ type })
  }

  async function submitEdit(asset: AssetListItem, values: AssetEditValues) {
    if (asset.type === 'note') {
      if ('url' in values || 'timeText' in values || 'dueAt' in values) {
        return false
      }

      const updated = await updateAsset({
        assetId: asset.id,
        assetType: 'note',
        rawInput: values.rawInput,
        title: values.title,
        content: values.content,
      })
      if (updated) {
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      }
      return !!updated
    }

    if (asset.type === 'todo') {
      if ('url' in values) {
        return false
      }

      const updated = await updateAsset({
        assetId: asset.id,
        assetType: 'todo',
        rawInput: values.rawInput,
        title: values.title,
        content: 'content' in values ? values.content : undefined,
        ...(('timeText' in values && values.timeText !== undefined) || ('dueAt' in values && values.dueAt !== undefined)
          ? {
              timeText: 'timeText' in values ? values.timeText : undefined,
              dueAt: 'dueAt' in values ? values.dueAt : undefined,
            }
          : {}),
      })
      if (updated) {
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      }
      return !!updated
    }

    const updated = await updateAsset({
      assetId: asset.id,
      assetType: 'link',
      rawInput: values.rawInput,
      title: values.title,
      note: 'note' in values ? values.note : null,
      url: 'url' in values ? values.url : '',
    })
    if (updated) {
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
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

  return (
    <>
      <section className="mb-8 sm:mb-10">
        <WorkspacePageHeader
          title={t('title')}
          eyebrow={t('eyebrow')}
          description={t('description')}
          className="mb-6"
        />

        <div className="mt-1">
          <ArchiveSummaryBar
            totalCount={totalCount}
            assetCounts={assetCounts}
            completedTodoCount={completedTodoCount}
            hasNextPage={pageInfo.hasNextPage}
          />
        </div>

        <div className="mt-5 flex flex-col gap-4 border-y border-border/10 py-4 sm:flex-row sm:items-center sm:justify-between">
          <WorkspaceFilterTabs
            tabs={filterTabs.map((tab) => ({ key: tab.key, label: tF(`tabs.${tab.key}`) }))}
            value={activeFilter}
            onValueChange={(value) => void handleFilterChange(value)}
            className="border-b-0 pb-0"
          />
        </div>
      </section>

      <div className={`w-full max-w-6xl min-w-0 space-y-6 overflow-hidden ${refreshing ? 'opacity-60' : ''}`}>
        {timelineGroups.map((group) => (
          <TimelineGroup
            key={group.key}
            label={group.label}
            hint={group.hint}
            count={group.assets.length}
            assets={group.assets}
            onEdit={setEditingAsset}
            onArchive={handleArchive}
            onMoveToTrash={handleMoveToTrash}
          />
        ))}

        {!hasAnyAssets && (
          <WorkspaceEmptyState
            title={tF(`empty.${emptyFilterMessages[activeFilter] ?? emptyFilterMessages.all}`)}
            description={
              activeFilter === 'all'
                ? t('emptyHint1')
                : t('emptyHint2')
            }
            icon={activeFilter === 'all' ? Inbox : Archive}
            action={
              <Link
                href="/workspace"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_12px_26px_-16px_rgba(0,81,177,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-px"
              >
                {t('openLaunchpad')}
                <ArrowRight className="size-4" />
              </Link>
            }
          />
        )}

        {hasAnyAssets ? (
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
