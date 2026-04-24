'use client'

import { NotepadText } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog, type AssetEditValues } from '@/components/workspace/asset-edit-dialog'
import {
  WorkspaceEmptyState,
  workspaceMetaTextClassName,
  workspacePillClassName,
  WorkspacePageHeader,
} from '@/components/workspace/workspace-view-primitives'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { useWorkspaceAssetsPage } from '@/hooks/workspace/use-workspace-assets-page'
import { formatAssetRelativeTime } from '@/shared/assets/asset-time-display'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { type PaginatedResult } from '@/shared/pagination'

function NoteCard({
  note,
  onEdit,
  onArchive,
  onMoveToTrash,
}: {
  note: AssetListItem
  onEdit: (note: AssetListItem) => void
  onArchive: (note: AssetListItem) => void
  onMoveToTrash: (note: AssetListItem) => void
}) {
  const titleText = note.title?.trim() ?? ''
  const excerptText = note.excerpt?.trim() ?? ''
  const contentText = note.content?.trim() || excerptText
  const fallbackTitle = note.originalText.trim().slice(0, 32)
  const hasTitle =
    titleText.length > 0 &&
    titleText !== excerptText &&
    titleText !== contentText &&
    titleText !== fallbackTitle

  return (
    <article className="group flex min-h-[190px] flex-col rounded-[14px] border border-border/18 bg-surface-container-lowest/90 px-4 py-4 shadow-[var(--shadow-note-card)] transition-[border-color,background-color,box-shadow] duration-200 ease-out hover:border-border/28 hover:bg-surface-container-lowest hover:shadow-[var(--shadow-elevation-1)]">
      <div className="flex items-start gap-3">
        <span className={`${workspaceMetaTextClassName} shrink-0`}>
          笔记 · {formatAssetRelativeTime(note.createdAt)}
        </span>

        <div className="ml-auto shrink-0">
          <AssetActionMenu
            actions={[
              { label: '编辑', onClick: () => onEdit(note) },
              { label: '归档', onClick: () => onArchive(note) },
              { label: '移入回收站', onClick: () => onMoveToTrash(note), danger: true },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        {hasTitle ? (
          <>
            <h3 className="font-headline text-[0.98rem] font-semibold leading-7 tracking-[-0.01em] text-on-surface line-clamp-2 md:text-[1.04rem]">
              {titleText}
            </h3>
            <Separator className="mt-3 mb-3 bg-border/12" />
          </>
        ) : null}

        <p className={`flex-1 whitespace-pre-wrap leading-7 ${hasTitle ? 'text-[14px] text-on-surface-variant md:text-[15px]' : 'text-[15px] text-on-surface md:text-[16px]'}`}>
          {contentText || '暂无正文'}
        </p>
      </div>
    </article>
  )
}

function EmptyState() {
  return (
    <WorkspaceEmptyState
      title="暂无笔记"
      description="从启动台/统一入口保存一条文本记录"
      icon={NotepadText}
      className="mt-20 py-16"
    />
  )
}

export function NotesClient({ initialPage }: { initialPage: PaginatedResult<AssetListItem> }) {
  const { items, setItems, pageInfo, loadingMore, loadMore } = useWorkspaceAssetsPage({
    initialPage,
    initialQuery: { type: 'note' },
  })
  const [editingNote, setEditingNote] = useState<AssetListItem | null>(null)
  const { updateAsset, archiveAsset, moveToTrash } = useAssetMutations()
  const noteCount = items.length

  async function submitEdit(
    note: AssetListItem,
    values: AssetEditValues
  ) {
    if ('url' in values || 'timeText' in values || 'dueAt' in values) {
      return false
    }

    const updated = await updateAsset({
      assetId: note.id,
      assetType: 'note',
      rawInput: values.rawInput,
      title: values.title,
      content: 'content' in values ? values.content : undefined,
    })

    if (updated) {
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    }

    return !!updated
  }

  async function handleArchive(note: AssetListItem) {
    const updated = await archiveAsset(note.id, note.type, {
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

  async function handleMoveToTrash(note: AssetListItem) {
    const updated = await moveToTrash(note.id, note.type, {
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
    <div className="mx-auto w-full max-w-7xl px-1 sm:px-2">
      <WorkspacePageHeader
        title="笔记"
        eyebrow="手稿"
        description="从统一入口留下的想法、碎片和草稿，会被整理成更适合扫读的手稿版面。"
      />

      <div className="mb-7 flex flex-wrap items-center gap-3 md:mb-8">
        <span className={workspacePillClassName}>已加载 {noteCount} 条</span>
        <span className={workspacePillClassName}>
          {pageInfo.hasNextPage ? '还有更多' : '已加载全部'}
        </span>
        <p className={`${workspaceMetaTextClassName} text-on-surface-variant`}>
          最近记录会优先展示，内容采用瀑布流排布并随长度自动增高。
        </p>
      </div>

      {items.length > 0 ? (
        <div className="columns-1 gap-4 [column-gap:1rem] md:columns-2 md:[column-gap:1.25rem] xl:columns-3 xl:[column-gap:1.5rem]">
          {items.map((note) => (
            <div key={note.id} className="mb-4 break-inside-avoid md:mb-5 xl:mb-6">
              <NoteCard
                note={note}
                onEdit={setEditingNote}
                onArchive={handleArchive}
                onMoveToTrash={handleMoveToTrash}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

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
        asset={editingNote}
        onOpenChange={(open) => {
          if (!open) setEditingNote(null)
        }}
        onSubmit={submitEdit}
      />
    </div>
  )
}
