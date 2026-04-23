'use client'

import { Archive, ArrowRight, CheckSquare2, FileText, Inbox, Link2, Sparkles } from 'lucide-react'
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
  WorkspaceSectionDivider,
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

const typeSummary: Record<AssetType, string> = {
  note: '想法与摘录',
  link: '链接与来源',
  todo: '下一步行动',
}

const typeSummaryStyles: Record<AssetType, { row: string; icon: string; mark: string }> = {
  note: {
    row: 'bg-primary/6',
    icon: 'bg-primary/10 text-primary',
    mark: 'bg-primary',
  },
  link: {
    row: 'bg-secondary/7',
    icon: 'bg-secondary/10 text-secondary',
    mark: 'bg-secondary',
  },
  todo: {
    row: 'bg-tertiary/8',
    icon: 'bg-tertiary/12 text-tertiary',
    mark: 'bg-tertiary',
  },
}

function SummaryCount({
  count,
  icon: Icon,
  label,
  type,
}: {
  count: number
  icon: typeof FileText
  label: string
  type: AssetType
}) {
  const styles = typeSummaryStyles[type]

  return (
    <div
      className={`group flex items-center justify-between gap-3 rounded-2xl border border-border/10 px-3.5 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-border/20 hover:bg-surface-container-lowest/70 active:translate-y-px ${styles.row}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-7 w-1 rounded-full ${styles.mark}`} />
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-on-surface">{label}</p>
          <p className="text-[11px] text-on-surface-variant/75">{typeSummary[type]}</p>
        </div>
      </div>
      <span className="font-mono text-xl font-semibold leading-none text-on-surface tabular-nums">
        {count}
      </span>
    </div>
  )
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
    <article className="group rounded-2xl border border-transparent px-3 py-4 transition-all duration-200 hover:border-border/12 hover:bg-surface-container-lowest hover:shadow-[var(--shadow-elevation-1)] sm:px-4 sm:py-5">
      <div className="flex items-start gap-4 lg:gap-5">
        <div
          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/8 ${presentation.iconBg}`}
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
                className={`text-[16px] font-semibold leading-7 tracking-normal sm:text-[17px] ${
                  asset.completed
                    ? 'text-on-surface-variant line-through'
                    : 'text-on-surface group-hover:text-primary transition-colors'
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
  const summaryItems: Array<{ type: AssetType; icon: typeof FileText }> = [
    { type: 'note', icon: FileText },
    { type: 'link', icon: Link2 },
    { type: 'todo', icon: CheckSquare2 },
  ]

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
          eyebrow="Personal Curator"
          description="把最近捕获的笔记、书签和待办放在同一条时间线里。先看全局，再按类型收窄，快速找到该处理的内容。"
          className="mb-6"
        />

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.75fr)]">
          <div className="relative overflow-hidden rounded-[1.25rem] border border-border/10 bg-surface-container-lowest/80 px-5 py-5 shadow-[0_20px_40px_-28px_rgba(0,81,177,0.36)]">
            <div className="relative flex min-h-32 flex-col justify-between gap-8">
              <div className="flex items-center gap-2 text-[12px] font-medium text-on-surface-variant">
                <span className="flex size-8 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                  <Sparkles className="size-4" />
                </span>
                当前知识流
              </div>
              <div>
                <p className="font-mono text-5xl font-semibold leading-none tracking-normal text-on-surface tabular-nums">
                  {totalCount}
                </p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">
                  {totalCount > 0
                    ? '内容已经进入同一条时间线，可以继续按类型收窄。'
                    : '还没有内容进入时间线，先从启动台保存第一条记录。'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            {summaryItems.map(({ type, icon }) => (
              <SummaryCount
                key={type}
                count={assetCounts[type]}
                icon={icon}
                label={typeLabels[type]}
                type={type}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-y border-border/10 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/8 text-primary">
              <Sparkles className="size-4" />
            </span>
            <span>
              已加载 {totalCount} 条内容
              {completedTodoCount > 0 ? `，${completedTodoCount} 条待办已完成` : ''}
              {pageInfo.hasNextPage ? '，还有更多' : '，已加载全部'}
            </span>
          </div>
          <WorkspaceFilterTabs
            tabs={filterTabs}
            value={activeFilter}
            onValueChange={(value) => void handleFilterChange(value)}
            className="border-b-0 pb-0"
          />
        </div>
      </section>

      <div className={`max-w-6xl ${refreshing ? 'opacity-60' : ''}`}>
        {todayAssets.length > 0 && (
          <section aria-labelledby="today-assets">
            <h2 id="today-assets" className="sr-only">
              今天的内容
            </h2>
            <WorkspaceSectionDivider label="今天" />
            <div className="grid gap-2">
              {todayAssets.map((asset) => (
                <AssetItem
                  key={asset.id}
                  asset={asset}
                  onEdit={setEditingAsset}
                  onArchive={handleArchive}
                  onMoveToTrash={handleMoveToTrash}
                />
              ))}
            </div>
          </section>
        )}

        {yesterdayAssets.length > 0 && (
          <section aria-labelledby="yesterday-assets">
            <h2 id="yesterday-assets" className="sr-only">
              昨天的内容
            </h2>
            <WorkspaceSectionDivider label="昨天" />
            <div className="grid gap-2">
              {yesterdayAssets.map((asset) => (
                <AssetItem
                  key={asset.id}
                  asset={asset}
                  onEdit={setEditingAsset}
                  onArchive={handleArchive}
                  onMoveToTrash={handleMoveToTrash}
                />
              ))}
            </div>
          </section>
        )}

        {olderAssets.length > 0 && (
          <section aria-labelledby="older-assets">
            <h2 id="older-assets" className="sr-only">
              更早的内容
            </h2>
            <WorkspaceSectionDivider label="更早" />
            <div className="grid gap-2">
              {olderAssets.map((asset) => (
                <AssetItem
                  key={asset.id}
                  asset={asset}
                  onEdit={setEditingAsset}
                  onArchive={handleArchive}
                  onMoveToTrash={handleMoveToTrash}
                />
              ))}
            </div>
          </section>
        )}

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
