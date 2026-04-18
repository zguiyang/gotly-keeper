'use client'

import { FileText } from 'lucide-react'
import { useState } from 'react'

import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog } from '@/components/workspace/asset-edit-dialog'
import {
  WorkspaceEmptyState,
  workspaceMetaTextClassName,
  WorkspacePageHeader,
  workspaceSurfaceClassName,
} from '@/components/workspace/workspace-view-primitives'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { formatAssetRelativeTime } from '@/shared/assets/asset-time-display'
import { type AssetListItem } from '@/shared/assets/assets.types'

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

  return (
    <article
      className={`${workspaceSurfaceClassName} mb-5 flex min-h-[196px] break-inside-avoid flex-col p-5 transition-transform duration-200 hover:-translate-y-0.5`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className={`${workspaceMetaTextClassName} order-2 ml-auto shrink-0`}>
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

      <div className="flex flex-1 flex-col">
        {hasTitle && (
          <h3 className="mb-2 text-lg font-semibold leading-7 tracking-[-0.02em] text-on-surface line-clamp-2">
            {note.title}
          </h3>
        )}
        <p className="text-[15px] leading-7 text-on-surface-variant whitespace-pre-wrap line-clamp-5">
          {note.excerpt}
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
      icon={FileText}
      className="mt-20 py-16"
    />
  )
}

export function NotesClient({ notes }: { notes: AssetListItem[] }) {
  const [items, setItems] = useState(notes)
  const [editingNote, setEditingNote] = useState<AssetListItem | null>(null)
  const { updateAsset, archiveAsset, moveToTrash } = useAssetMutations()

  async function submitEdit(note: AssetListItem, values: { text: string }) {
    const updated = await updateAsset({
      assetId: note.id,
      assetType: 'note',
      text: values.text,
    })

    if (updated) {
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    }

    return !!updated
  }

  async function handleArchive(note: AssetListItem) {
    const updated = await archiveAsset(note.id, note.type)
    if (updated) {
      setItems((current) => current.filter((item) => item.id !== updated.id))
    }
  }

  async function handleMoveToTrash(note: AssetListItem) {
    const updated = await moveToTrash(note.id, note.type)
    if (updated) {
      setItems((current) => current.filter((item) => item.id !== updated.id))
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <WorkspacePageHeader
        title="笔记"
        description="从统一入口留下的想法、碎片和草稿，会被整理成便于回看的知识卡片。"
      />

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={setEditingNote}
              onArchive={handleArchive}
              onMoveToTrash={handleMoveToTrash}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

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
