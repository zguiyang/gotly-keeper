'use client'

import { Share2, Bookmark, ExternalLink } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog } from '@/components/workspace/asset-edit-dialog'
import {
  WorkspaceEmptyState,
  workspaceMetaTextClassName,
  workspacePillClassName,
  WorkspacePageHeader,
} from '@/components/workspace/workspace-view-primitives'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { BOOKMARK_META_STATUS } from '@/shared/assets/bookmark-meta.types'
import { formatBookmarkTime } from '@/shared/time/formatters'

function getHostname(url: string | null) {
  if (!url) return 'saved link'

  try {
    return new URL(url).hostname
  } catch {
    return 'saved link'
  }
}

function BookmarkItem({
  item,
  onEdit,
  onArchive,
  onMoveToTrash,
}: {
  item: AssetListItem
  onEdit: (item: AssetListItem) => void
  onArchive: (item: AssetListItem) => void
  onMoveToTrash: (item: AssetListItem) => void
}) {
  const status = item.bookmarkMeta?.status ?? null

  return (
    <div className="group -mx-4 rounded-lg px-4 py-6 transition-colors duration-150 hover:bg-surface-container-low/50 lg:py-8">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`${workspacePillClassName} border-primary/10 bg-primary/8 text-primary`}>
              {getHostname(item.url)}
            </span>
            {status === BOOKMARK_META_STATUS.PENDING && (
              <span className={`${workspacePillClassName} border-amber-200/60 bg-amber-50 text-amber-700`}>解析中</span>
            )}
            {status === BOOKMARK_META_STATUS.SUCCESS && (
              <span className={`${workspacePillClassName} border-emerald-200/60 bg-emerald-50 text-emerald-700`}>已补全</span>
            )}
            {status === BOOKMARK_META_STATUS.FAILED && (
              <span className={`${workspacePillClassName} border-red-200/60 bg-red-50 text-red-700`}>补全失败</span>
            )}
            {status === BOOKMARK_META_STATUS.SKIPPED_PRIVATE_URL && (
              <span className={`${workspacePillClassName} bg-slate-100 text-slate-700`}>私网地址已跳过</span>
            )}
            <span className={`${workspaceMetaTextClassName} hidden sm:block`}>
              {formatBookmarkTime(item.createdAt)}
            </span>
          </div>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 group/title">
              {item.bookmarkMeta?.icon && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 rounded-sm bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${item.bookmarkMeta.icon}")` }}
                />
              )}
              <h3 className="text-base lg:text-xl font-bold text-on-surface group-hover/title:text-primary transition-colors cursor-pointer leading-snug line-clamp-2 lg:line-clamp-none">
                {item.title}
              </h3>
              <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant/40 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
            </a>
          ) : (
            <div className="flex items-center gap-1.5">
              <h3 className="text-base lg:text-xl font-bold text-on-surface leading-snug line-clamp-2 lg:line-clamp-none">
                {item.title}
              </h3>
            </div>
          )}
          <p className="max-w-3xl text-[15px] leading-7 text-on-surface-variant line-clamp-2 sm:line-clamp-3 lg:line-clamp-none">
            {item.excerpt}
          </p>
          <span className={`${workspaceMetaTextClassName} sm:hidden`}>{formatBookmarkTime(item.createdAt)}</span>
        </div>
        <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity lg:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-on-surface-variant hover:text-primary"
            aria-label="分享收藏"
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
    </div>
  )
}

function Divider() {
  return <Separator className="mx-4 bg-outline-variant/10" />
}

export function BookmarksClient({ bookmarks }: { bookmarks: AssetListItem[] }) {
  const [items, setItems] = useState(bookmarks)
  const [editingBookmark, setEditingBookmark] = useState<AssetListItem | null>(null)
  const { updateAsset, archiveAsset, moveToTrash } = useAssetMutations()

  async function submitEdit(item: AssetListItem, values: { text: string; url?: string }) {
    const updated = await updateAsset({
      assetId: item.id,
      assetType: 'link',
      text: values.text,
      url: values.url ?? '',
    })

    if (updated) {
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)))
    }

    return !!updated
  }

  async function handleArchive(item: AssetListItem) {
    const updated = await archiveAsset(item.id, item.type)
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

  return (
    <>
      <div className="mb-10">
        <WorkspacePageHeader title="我的收藏" description="按来源与内容整理过的链接收藏，适合回看、筛选和继续深入。" />
      </div>

      <div className="max-w-6xl">
        <div className="space-y-0">
          {items.map((item, index) => (
            <div key={item.id}>
              <BookmarkItem
                item={item}
                onEdit={setEditingBookmark}
                onArchive={handleArchive}
                onMoveToTrash={handleMoveToTrash}
              />
              {index < items.length - 1 && <Divider />}
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <WorkspaceEmptyState title="暂无书签" icon={Bookmark} className="mt-20 py-12" />
        )}
      </div>

      <AssetEditDialog
        asset={editingBookmark}
        onOpenChange={(open) => {
          if (!open) setEditingBookmark(null)
        }}
        onSubmit={submitEdit}
      />
    </>
  )
}
