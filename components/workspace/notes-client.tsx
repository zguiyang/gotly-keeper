'use client'

import { FileText } from 'lucide-react'
import { useState } from 'react'

import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { WorkspaceEmptyState, WorkspacePageHeader } from '@/components/workspace/workspace-view-primitives'
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
    <div className="mb-4 flex min-h-[140px] break-inside-avoid flex-col rounded-lg bg-surface-container-lowest p-4 shadow-note-card transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <AssetActionMenu
          actions={[
            { label: '编辑', onClick: () => onEdit(note) },
            { label: '归档', onClick: () => onArchive(note) },
            { label: '移入回收站', onClick: () => onMoveToTrash(note), danger: true },
          ]}
        />
        <span className="text-[10px] text-on-surface-variant/60">
          {note.timeText || formatAssetRelativeTime(note.createdAt)}
        </span>
      </div>

      <div className="flex-1">
        {hasTitle && (
          <h3 className="text-sm font-medium text-on-surface mb-1 leading-snug line-clamp-2">
            {note.title}
          </h3>
        )}
        <p className="text-xs text-on-surface-variant whitespace-pre-wrap leading-relaxed line-clamp-4">
          {note.excerpt}
        </p>
      </div>
    </div>
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
  const { updateAsset, archiveAsset, moveToTrash } = useAssetMutations()

  async function handleEdit(note: AssetListItem) {
    const text = window.prompt('编辑笔记内容', note.originalText)
    if (!text || !text.trim() || text.trim() === note.originalText) {
      return
    }

    const updated = await updateAsset({
      assetId: note.id,
      assetType: 'note',
      text: text.trim(),
    })

    if (updated) {
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    }
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
      <WorkspacePageHeader title="笔记" description="从统一入口保存的文本记录，会整理在这里" />

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onMoveToTrash={handleMoveToTrash}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}
