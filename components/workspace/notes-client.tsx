'use client'

import { FileText, NotebookPen } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog, type AssetEditValues } from '@/components/workspace/asset-edit-dialog'
import {
  WorkspaceEmptyState,
  workspaceMetaTextClassName,
  workspacePillClassName,
  WorkspacePageHeader,
  workspaceSurfaceClassName,
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
  const hasTitle = note.title && note.title !== note.excerpt
  const displayTitle = hasTitle ? note.title : '未命名笔记'

  return (
    <article
      className={`${workspaceSurfaceClassName} group flex min-h-[220px] flex-col overflow-hidden rounded-2xl border-border/20 bg-surface-container-lowest p-0 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-border/30 hover:shadow-[var(--shadow-elevation-2)]`}
    >
      <div className="flex items-center gap-3 border-b border-dashed border-border/20 px-4 py-3 md:px-5">
        <div className="inline-flex items-center gap-2">
          <NotebookPen className="size-3.5 text-on-surface-variant/80" aria-hidden="true" />
          <span className={`${workspaceMetaTextClassName} uppercase`}>笔记卡片</span>
        </div>

        <span className={`${workspaceMetaTextClassName} ml-auto shrink-0`}>
          {note.timeText || formatAssetRelativeTime(note.createdAt)}
        </span>

        <AssetActionMenu
          actions={[
            { label: '编辑', onClick: () => onEdit(note) },
            { label: '归档', onClick: () => onArchive(note) },
            { label: '移入回收站', onClick: () => onMoveToTrash(note), danger: true },
          ]}
        />
      </div>

      <div className="flex flex-1 flex-col px-4 py-4 md:px-5 md:py-5">
        <h3 className="mb-2 font-headline text-[1.05rem] font-semibold leading-7 tracking-[-0.02em] text-on-surface line-clamp-2 md:text-[1.12rem]">
          {displayTitle}
        </h3>

        <p className="flex-1 text-[14px] leading-7 text-on-surface-variant whitespace-pre-wrap md:text-[15px]">
          {note.excerpt}
        </p>
      </div>

      <div className="border-t border-border/10 px-4 py-3 md:px-5">
        <p className={`${workspaceMetaTextClassName} uppercase`}>已保存到 Workspace 笔记</p>
      </div>
    </article>
  )
}

function EmptyState() {
  return (
    <WorkspaceEmptyState
      title="暂无笔记"
      description="从启动台/统一入口保存一条文本记录"
      icon={FileText}
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
    if (!('content' in values) || 'timeText' in values) {
      return false
    }

    const updated = await updateAsset({
      assetId: note.id,
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
        eyebrow="Workspace"
        description="从统一入口留下的想法、碎片和草稿，会被整理成便于回看的知识卡片。"
      />

      <div className="mb-7 flex flex-wrap items-center gap-3 md:mb-8">
        <span className={workspacePillClassName}>已加载 {noteCount} 条</span>
        <span className={workspacePillClassName}>
          {pageInfo.hasNextPage ? '还有更多' : '已加载全部'}
        </span>
        <p className={`${workspaceMetaTextClassName} text-on-surface-variant`}>
          最近记录会优先展示，卡片采用瀑布流排布并随内容自动增高。
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
