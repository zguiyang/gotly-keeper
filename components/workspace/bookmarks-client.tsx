'use client'

import { Link2, Share2, Bookmark, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog, type AssetEditValues } from '@/components/workspace/asset-edit-dialog'
import {
  WorkspaceEmptyState,
  workspaceMetaTextClassName,
  workspaceContentCardSurfaceClassName,
  WorkspacePageHeader,
  workspacePillClassName,
} from '@/components/workspace/workspace-view-primitives'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { useWorkspaceAssetsPage } from '@/hooks/workspace/use-workspace-assets-page'
import { cn } from '@/lib/utils'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { type PaginatedResult } from '@/shared/pagination'
import { formatBookmarkTime } from '@/shared/time/formatters'

function getHostname(url: string | null) {
  if (!url) return 'saved link'

  try {
    return new URL(url).hostname
  } catch {
    return 'saved link'
  }
}

async function copyBookmarkUrl(url: string) {
  if (!navigator.clipboard?.writeText) {
    return { ok: false as const, reason: 'clipboard-unavailable' as const }
  }

  try {
    await navigator.clipboard.writeText(url)
    return { ok: true as const }
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      return { ok: false as const, reason: 'clipboard-blocked' as const }
    }

    return { ok: false as const, reason: 'clipboard-failed' as const }
  }
}

function BookmarkItem({
  item,
  onShare,
  onEdit,
  onArchive,
  onMoveToTrash,
}: {
  item: AssetListItem
  onShare: (item: AssetListItem) => Promise<void>
  onEdit: (item: AssetListItem) => void
  onArchive: (item: AssetListItem) => void
  onMoveToTrash: (item: AssetListItem) => void
}) {
  return (
    <article
      className={cn(
        workspaceContentCardSurfaceClassName,
        'group overflow-hidden transition-[border-color,box-shadow,background-color] duration-200 ease-out motion-reduce:transition-none hover:border-border/18 hover:shadow-[var(--shadow-elevation-2)]'
      )}
    >
      <div className="flex items-start justify-between gap-4 px-4 pt-4 md:px-5 md:pt-5">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {item.bookmarkMeta?.icon ? (
              <span
                aria-hidden="true"
                className="size-4 shrink-0 rounded-[4px] bg-cover bg-center bg-no-repeat ring-1 ring-border/10"
                style={{ backgroundImage: `url("${item.bookmarkMeta.icon}")` }}
              />
            ) : null}
            <span className="max-w-[16rem] truncate text-[12px] font-medium text-on-surface-variant/85 sm:max-w-[20rem]">
              {getHostname(item.url)}
            </span>
          </div>

          <div className="space-y-2">
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/title inline-flex items-start gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              >
                <h3 className="font-headline text-[1.03rem] font-semibold leading-7 tracking-[-0.015em] text-on-surface transition-colors duration-150 group-hover/title:text-primary sm:text-[1.1rem] lg:text-[1.2rem]">
                  {item.title}
                </h3>
                <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-on-surface-variant/75 opacity-0 transition-opacity duration-150 group-hover/title:opacity-100" />
              </a>
            ) : (
              <h3 className="font-headline text-[1.03rem] font-semibold leading-7 tracking-[-0.015em] text-on-surface sm:text-[1.1rem] lg:text-[1.2rem]">
                {item.title}
              </h3>
            )}
            <p className="max-w-3xl text-[14px] leading-7 text-on-surface-variant sm:text-[15px] sm:line-clamp-3">
              {item.excerpt}
            </p>
          </div>

          {item.url ? (
            <div className="inline-flex items-center gap-1.5 text-[12px] text-on-surface-variant/80">
              <Link2 className="size-3.5" aria-hidden="true" />
              <span className="truncate">{item.url.replace(/^https?:\/\//, '')}</span>
            </div>
          ) : null}
        </div>

        <div className="z-10 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-on-surface-variant transition-colors duration-150 hover:text-primary"
            aria-label="分享收藏"
            onClick={() => void onShare(item)}
          >
            <Share2 />
          </Button>
          <AssetActionMenu
            actions={[
              { label: '编辑', onClick: () => onEdit(item) },
              { label: '归档', onClick: () => onArchive(item) },
              { label: '移入回收站', onClick: () => onMoveToTrash(item), danger: true },
            ]}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/10 px-4 py-3 md:px-5">
        <p className={workspaceMetaTextClassName}>{formatBookmarkTime(item.createdAt)}</p>
      </div>
    </article>
  )
}

function Divider() {
  return <Separator className="mx-4 bg-border/10 md:mx-5" />
}

export function BookmarksClient({
  initialPage,
}: {
  initialPage: PaginatedResult<AssetListItem>
}) {
  const { items, setItems, pageInfo, loadingMore, loadMore } = useWorkspaceAssetsPage({
    initialPage,
    initialQuery: { type: 'link' },
  })
  const [editingBookmark, setEditingBookmark] = useState<AssetListItem | null>(null)
  const { updateAsset, archiveAsset, moveToTrash } = useAssetMutations()

  async function handleShare(item: AssetListItem) {
    if (!item.url) {
      toast.error('该书签没有可分享的链接')
      return
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          url: item.url,
        })
        return
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          toast('已取消分享')
          return
        }
      }
    }

    const copyResult = await copyBookmarkUrl(item.url)

    if (copyResult.ok) {
      toast.success('链接已复制，可直接粘贴分享')
      return
    }

    if (!navigator.share && copyResult.reason === 'clipboard-unavailable') {
      toast.error('当前浏览器不支持系统分享，且无法复制链接')
      return
    }

    if (copyResult.reason === 'clipboard-blocked') {
      toast.error('无法访问剪贴板，请检查浏览器复制权限')
      return
    }

    toast.error('复制链接失败，请稍后重试')
  }

  async function submitEdit(
    item: AssetListItem,
    values: AssetEditValues
  ) {
    if (!('note' in values)) {
      return false
    }

    const updated = await updateAsset({
      assetId: item.id,
      assetType: 'link',
      rawInput: values.rawInput,
      title: values.title,
      note: values.note,
      url: values.url,
    })

    if (updated) {
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
    }

    return !!updated
  }

  async function handleArchive(item: AssetListItem) {
    const updated = await archiveAsset(item.id, item.type, {
      onUndo: (restored) => {
        setItems((current) =>
          current.some((entry) => entry.id === restored.id) ? current : [restored, ...current]
        )
      },
    })
    if (updated) {
      setItems((current) => current.filter((entry) => entry.id !== updated.id))
    }
  }

  async function handleMoveToTrash(item: AssetListItem) {
    const updated = await moveToTrash(item.id, item.type, {
      onUndo: (restored) => {
        setItems((current) =>
          current.some((entry) => entry.id === restored.id) ? current : [restored, ...current]
        )
      },
    })
    if (updated) {
      setItems((current) => current.filter((entry) => entry.id !== updated.id))
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-1 sm:px-2">
      <WorkspacePageHeader
        title="我的收藏"
        eyebrow="阅读队列"
        description="按来源与内容整理过的链接收藏，支持快速回看、二次筛选和继续深入。"
      />

      <div className="mb-7 flex flex-col gap-2 md:mb-8">
        <p className="text-sm leading-6 text-on-surface-variant">
          已加载 {items.length} 条
          {pageInfo.hasNextPage ? '，还有更多' : '，已加载全部'}
        </p>
        <span className={workspacePillClassName}>按来源排序回看</span>
      </div>

      <div className="max-w-6xl space-y-4">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id}>
              <BookmarkItem
                item={item}
                onShare={handleShare}
                onEdit={setEditingBookmark}
                onArchive={handleArchive}
                onMoveToTrash={handleMoveToTrash}
              />
              {index < items.length - 1 && <Divider />}
            </div>
          ))}
        </div>

        {items.length === 0 ? (
          <WorkspaceEmptyState
            title="暂无书签"
            description="从浏览器插件、快捷入口或粘贴链接开始收集，你的阅读队列会在这里形成。"
            icon={Bookmark}
            className="mt-20 py-12"
          />
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={!pageInfo.hasNextPage || loadingMore}
            onClick={() => void loadMore()}
          >
            {pageInfo.hasNextPage ? (loadingMore ? '加载中...' : '加载更多') : '已加载全部'}
          </Button>
        </div>
      ) : null}

      <AssetEditDialog
        asset={editingBookmark}
        onOpenChange={(open) => {
          if (!open) setEditingBookmark(null)
        }}
        onSubmit={submitEdit}
      />
    </div>
  )
}
