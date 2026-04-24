'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { NotepadText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NoteInlineEditor } from '@/components/workspace/note-inline-editor'
import { NoteMarkdown } from '@/components/workspace/note-markdown'
import {
  WorkspaceEmptyState,
  workspaceMetaTextClassName,
  workspacePillClassName,
  WorkspacePageHeader,
} from '@/components/workspace/workspace-view-primitives'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { useNoteInlineEdit } from '@/hooks/workspace/use-note-inline-edit'
import { useWorkspaceAssetsPage } from '@/hooks/workspace/use-workspace-assets-page'
import { cn } from '@/lib/utils'
import { formatAssetRelativeTime } from '@/shared/assets/asset-time-display'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { type PaginatedResult } from '@/shared/pagination'

function NoteCardContextMenu({
  disabled,
  onArchive,
  onMoveToTrash,
  children,
}: {
  disabled: boolean
  onArchive: () => void
  onMoveToTrash: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (open) {
      triggerRef.current?.focus()
    }
  }, [open])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div
        onContextMenu={(event) => {
          if (disabled) {
            return
          }

          event.preventDefault()
          setAnchor({ x: event.clientX, y: event.clientY })
          setOpen(true)
        }}
      >
        {children}
      </div>

      <DropdownMenuTrigger
        ref={triggerRef}
        render={
          <button
            type="button"
            className="pointer-events-none fixed h-px w-px opacity-0"
            style={{ left: anchor.x, top: anchor.y }}
          />
        }
      />
      <DropdownMenuContent align="start" sideOffset={6} className="min-w-[152px]">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onArchive} className="text-[12px]">
            归档
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onMoveToTrash} className="text-[12px]">
            移入回收站
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NoteCard({
  note,
  isEditing,
  editLocked,
  onStartEdit,
  onStopEdit,
  onSave,
  onArchive,
  onMoveToTrash,
}: {
  note: AssetListItem
  isEditing: boolean
  editLocked: boolean
  onStartEdit: (noteId: string) => void
  onStopEdit: () => void
  onSave: (note: AssetListItem, markdown: string) => Promise<boolean>
  onArchive: (note: AssetListItem) => void
  onMoveToTrash: (note: AssetListItem) => void
}) {
  const contentText = note.content ?? note.originalText ?? '暂无正文'
  const updatedAt = note.updatedAt ?? note.createdAt
  const { markdown, setMarkdown, status, errorMessage, saveNow, isDirty } = useNoteInlineEdit({
    initialMarkdown: contentText === '暂无正文' ? '' : contentText,
    onSave: (nextMarkdown) => onSave(note, nextMarkdown),
  })

  async function handleBlur() {
    const saved = await saveNow()
    if (!isDirty || saved) {
      onStopEdit()
    }
  }

  async function handleSubmitShortcut() {
    const saved = await saveNow()
    if (!isDirty || saved) {
      onStopEdit()
    }
  }

  return (
    <NoteCardContextMenu
      disabled={isEditing}
      onArchive={() => onArchive(note)}
      onMoveToTrash={() => onMoveToTrash(note)}
    >
      <article
        className={cn(
          'group relative flex min-h-[190px] flex-col rounded-[14px] border px-4 py-4 shadow-[var(--shadow-note-card)] transition-[border-color,background-color,box-shadow] duration-200 ease-out',
          isEditing
            ? 'border-primary/28 bg-background shadow-[var(--shadow-elevation-1)]'
            : 'border-border/18 bg-surface-container-lowest/90 hover:border-border/28 hover:bg-surface-container-lowest hover:shadow-[var(--shadow-elevation-1)]',
          !isEditing && !editLocked ? 'cursor-text' : undefined
        )}
        onClick={() => {
          if (!isEditing && !editLocked) {
            onStartEdit(note.id)
          }
        }}
      >
        <div className="flex flex-1 flex-col">
        {isEditing ? (
          <>
            <NoteInlineEditor
              markdown={markdown}
              ariaLabel="编辑笔记"
              onMarkdownChange={setMarkdown}
              onBlur={() => {
                void handleBlur()
              }}
              onSubmitShortcut={() => {
                void handleSubmitShortcut()
              }}
              className="min-h-[220px] flex-1"
            />
            {status !== 'idle' || errorMessage ? (
              <span
                className={cn(
                  workspaceMetaTextClassName,
                  'mt-3 block',
                  status === 'error' ? 'text-destructive' : 'text-on-surface-variant'
                )}
              >
                {status === 'saving'
                  ? '正在保存...'
                  : status === 'saved'
                    ? '已保存'
                    : errorMessage}
              </span>
            ) : null}
          </>
        ) : (
          <NoteMarkdown markdown={contentText} className="flex-1" />
        )}

          {!isEditing ? (
            <div className={`${workspaceMetaTextClassName} mt-4 text-on-surface-variant`}>
              <span>更新于 {formatAssetRelativeTime(updatedAt)}</span>
            </div>
          ) : null}
        </div>
      </article>
    </NoteCardContextMenu>
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
  const { updateAsset, archiveAsset, moveToTrash } = useAssetMutations()
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const noteCount = items.length

  async function saveNote(note: AssetListItem, markdown: string) {
    const nextContent = markdown

    if (!nextContent.trim()) {
      throw new Error('请至少填写一点内容。')
    }

    if (nextContent === (note.content ?? note.originalText)) {
      return true
    }

    const updated = await updateAsset(
      {
        assetId: note.id,
        assetType: 'note',
        rawInput: nextContent,
        content: nextContent,
      },
      { silent: true }
    )

    if (!updated) {
      throw new Error('保存失败，请重试。')
    }

    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    return true
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
                isEditing={editingNoteId === note.id}
                editLocked={editingNoteId !== null && editingNoteId !== note.id}
                onStartEdit={setEditingNoteId}
                onStopEdit={() => setEditingNoteId(null)}
                onSave={saveNote}
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

    </div>
  )
}
