'use client'

import { Archive, ArrowRight, Bookmark, Inbox, ListTodo, NotepadText } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog, type AssetEditValues } from '@/components/workspace/asset-edit-dialog'
import {
  WorkspaceEmptyState,
  WorkspaceFilterTabs,
  workspaceMetaTextClassName,
  WorkspacePageHeader,
  workspacePillClassName,
  WorkspaceTypeBadge,
} from '@/components/workspace/workspace-view-primitives'
import { assetTypePresentation } from '@/config/ui/asset-presentation'
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
  const summaryItems: Array<{ type: AssetType; icon: typeof NotepadText }> = [
    { type: 'note', icon: NotepadText },
    { type: 'link', icon: Bookmark },
    { type: 'todo', icon: ListTodo },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border/10 bg-surface-container-lowest/80 px-4 py-3 shadow-[0_18px_40px_-32px_rgba(0,81,177,0.34)] md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-8 w-1 shrink-0 rounded-full bg-primary/55" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-surface">
              已加载 {totalCount} 条内容
              {hasNextPage ? '，还有更多待载入' : '，已加载全部'}
            </p>
            <p className="text-[11px] text-on-surface-variant/75">
              时间线按今天、昨天和更早分组，便于快速回看。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {summaryItems.map(({ type, icon: Icon }) => (
            <span key={type} className={workspacePillClassName}>
              <Icon className="mr-1.5 size-3.5" />
              {typeLabels[type]} {assetCounts[type]}
            </span>
          ))}
          {completedTodoCount > 0 ? <span className={workspacePillClassName}>已完成 {completedTodoCount}</span> : null}
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
  const timeText = asset.timeText || formatAssetRelativeTime(asset.createdAt)
  const actions = [
    { label: '编辑', onClick: () => onEdit(asset) },
    { label: '归档', onClick: () => onArchive(asset) },
    { label: '移入回收站', onClick: () => onMoveToTrash(asset), danger: true },
  ]

  return (
    <article className="group relative w-full min-w-0 rounded-[14px] border border-border/10 bg-surface-container-lowest/80 px-3 py-3 transition-[border-color,background-color] duration-200 hover:border-border/15 hover:bg-surface-container-lowest sm:px-4 sm:py-4">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/8 ${presentation.iconBg}`}
        >
          <Icon className={`h-[18px] w-[18px] ${presentation.iconColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <TypePill type={asset.type} />
            {asset.completed ? <span className={workspacePillClassName}>已完成</span> : null}
            <span className={workspaceMetaTextClassName}>{timeText}</span>
          </div>

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
            </div>

            <div className="shrink-0 pt-0.5 opacity-100 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
              <AssetActionMenu actions={actions} />
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
        <span className={workspacePillClassName}>{count} 条</span>
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
    { key: 'today', label: '今天', hint: '最近 24 小时', assets: todayAssets },
    { key: 'yesterday', label: '昨天', hint: '前一天', assets: yesterdayAssets },
    { key: 'older', label: '更早', hint: '更久以前', assets: olderAssets },
  ].filter((group) => group.assets.length > 0)

  async function handleFilterChange(nextFilter: string) {
    const type = nextFilter === 'all' ? undefined : (nextFilter as AssetType)
    setActiveFilter(nextFilter)
    await loadFirstPage({ type })
  }

  async function submitEdit(asset: AssetListItem, values: AssetEditValues) {
    if (asset.type === 'note') {
      if (!('content' in values) || 'timeText' in values) {
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
      if (!('timeText' in values) || !('content' in values)) {
        return false
      }

      const updated = await updateAsset({
        assetId: asset.id,
        assetType: 'todo',
        rawInput: values.rawInput,
        title: values.title,
        content: values.content,
        ...(values.timeText !== undefined
          ? {
              timeText: values.timeText,
              dueAt: values.timeText === asset.timeText ? asset.dueAt : null,
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
          title="知识库"
          eyebrow="全部内容"
          description="把最近捕获的笔记、书签和待办排成一条时间线。先看全局，再按类型收窄，快速找到该处理的内容。"
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
            tabs={filterTabs}
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
            title={emptyFilterMessages[activeFilter] ?? emptyFilterMessages.all}
            description={
              activeFilter === 'all'
                ? '打开启动台输入一句话，Gotly 会自动识别它是笔记、书签还是待办。'
                : '切回知识库可以查看其它类型，或从启动台继续捕获新内容。'
            }
            icon={activeFilter === 'all' ? Inbox : Archive}
            action={
              <Link
                href="/workspace"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_12px_26px_-16px_rgba(0,81,177,0.65)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-px"
              >
                打开启动台
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
              {pageInfo.hasNextPage ? (loadingMore ? '加载中...' : '加载更多') : '已加载全部'}
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
