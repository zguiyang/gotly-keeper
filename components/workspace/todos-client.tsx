'use client'

import { Check, Circle, Clock } from 'lucide-react'
import { useState } from 'react'


import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog } from '@/components/workspace/asset-edit-dialog'
import {
  WorkspaceEmptyState,
  workspaceMetaTextClassName,
  WorkspacePageHeader,
  workspaceSurfaceClassName,
} from '@/components/workspace/workspace-view-primitives'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { useTodoCompletion } from '@/hooks/workspace/use-todo-completion'
import { getTodoGroupKey } from '@/shared/assets/asset-time-display'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { groupLabels } from '@/shared/constants/assets'

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant/75">
        {label}
      </span>
      <span className="text-xs text-on-surface-variant/40">·</span>
      <span className={workspaceMetaTextClassName}>{count} 项</span>
    </div>
  )
}

function TodoItemComponent({
  item,
  pending,
  onToggle,
  onEdit,
  onArchive,
  onMoveToTrash,
}: {
  item: AssetListItem
  pending: boolean
  onToggle: (item: AssetListItem) => void
  onEdit: (item: AssetListItem) => void
  onArchive: (item: AssetListItem) => void
  onMoveToTrash: (item: AssetListItem) => void
}) {
  return (
    <div
      className={`group -mx-4 flex items-start justify-between rounded-2xl px-4 py-4 transition-opacity duration-150 ${
        item.completed ? 'opacity-60' : ''
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <Button
          type="button"
          onClick={() => onToggle(item)}
          disabled={pending}
          variant="ghost"
          size="icon-sm"
          className="mt-0.5 shrink-0 text-on-surface-variant/40 hover:text-primary"
          aria-label={item.completed ? '标记为未完成' : '标记为已完成'}
          title={item.completed ? '标记为未完成' : '标记为已完成'}
        >
          {item.completed ? (
            <Check className="text-primary" />
          ) : (
            <Circle />
          )}
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h4
            className={`text-[17px] font-semibold leading-7 tracking-[-0.02em] ${
              item.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'
            }`}
          >
            {item.title}
          </h4>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-on-surface-variant/65">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.timeText || '无截止日期'}
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant/40" />
            <span>来自统一入口</span>
          </div>
        </div>
      </div>
      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
        <AssetActionMenu
          actions={[
            { label: '编辑', onClick: () => onEdit(item), disabled: pending },
            { label: '归档', onClick: () => onArchive(item), disabled: pending },
            { label: '移入回收站', onClick: () => onMoveToTrash(item), disabled: pending, danger: true },
          ]}
        />
      </div>
    </div>
  )
}

function TodoSection({
  items,
  emptyMessage,
  pendingIds,
  onToggleTodo,
  onEdit,
  onArchive,
  onMoveToTrash,
}: {
  items: AssetListItem[]
  emptyMessage: string
  pendingIds: Set<string>
  onToggleTodo: (item: AssetListItem) => void
  onEdit: (item: AssetListItem) => void
  onArchive: (item: AssetListItem) => void
  onMoveToTrash: (item: AssetListItem) => void
}) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-on-surface-variant/50">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div key={item.id}>
          <TodoItemComponent
            item={item}
            pending={pendingIds.has(item.id)}
            onToggle={onToggleTodo}
            onEdit={onEdit}
            onArchive={onArchive}
            onMoveToTrash={onMoveToTrash}
          />
          {index < items.length - 1 && <Separator className="mx-4 bg-outline-variant/10" />}
        </div>
      ))}
    </div>
  )
}

export function TodosClient({ todos }: { todos: AssetListItem[] }) {
  const [items, setItems] = useState(todos)
  const [editingTodo, setEditingTodo] = useState<AssetListItem | null>(null)

  const { updateAsset, archiveAsset, moveToTrash, isPending } = useAssetMutations()
  const { state, toggleCompletion } = useTodoCompletion()

  const grouped = {
    today: items.filter((t) => getTodoGroupKey(t) === 'today'),
    thisWeek: items.filter((t) => getTodoGroupKey(t) === 'thisWeek'),
    noDate: items.filter((t) => getTodoGroupKey(t) === 'noDate'),
    completed: items.filter((t) => getTodoGroupKey(t) === 'completed'),
  }

  const showEmptyState = items.length === 0

  function replaceItem(updated: AssetListItem) {
    setItems((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    )
  }

  async function handleToggleTodo(item: AssetListItem) {
    const updated = await toggleCompletion(item.id, !item.completed)
    if (updated) {
      replaceItem(updated)
    }
  }

  async function submitEdit(item: AssetListItem, values: { text: string }) {
    const updated = await updateAsset({
      assetId: item.id,
      assetType: 'todo',
      text: values.text,
      timeText: item.timeText,
      dueAt: item.dueAt,
    })
    if (updated) {
      replaceItem(updated)
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

  const pendingIds = new Set<string>()
  if (state.pendingId) {
    pendingIds.add(state.pendingId)
  }
  for (const item of items) {
    if (isPending(item.id, 'update') || isPending(item.id, 'archive') || isPending(item.id, 'trash')) {
      pendingIds.add(item.id)
    }
  }

  return (
    <>
      <WorkspacePageHeader
        title="待办"
        description="从统一入口留下的待处理事项，会按时间线索整理成清晰、可回看的任务流。"
        eyebrow="Task Flow"
      />

      {showEmptyState ? (
        <WorkspaceEmptyState
          title="暂无待办"
          description="从统一入口保存新的待办后会出现在这里"
          icon={Check}
          className="py-16"
        />
      ) : (
        <div className="max-w-3xl space-y-9">
          {grouped.today.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.today} count={grouped.today.length} />
              <div className={workspaceSurfaceClassName}>
                <TodoSection
                  items={grouped.today}
                  emptyMessage="今天没有待办"
                  pendingIds={pendingIds}
                  onToggleTodo={handleToggleTodo}
                  onEdit={setEditingTodo}
                  onArchive={handleArchive}
                  onMoveToTrash={handleMoveToTrash}
                />
              </div>
            </div>
          )}

          {grouped.thisWeek.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.thisWeek} count={grouped.thisWeek.length} />
              <div className={workspaceSurfaceClassName}>
                <TodoSection
                  items={grouped.thisWeek}
                  emptyMessage="本周没有待办"
                  pendingIds={pendingIds}
                  onToggleTodo={handleToggleTodo}
                  onEdit={setEditingTodo}
                  onArchive={handleArchive}
                  onMoveToTrash={handleMoveToTrash}
                />
              </div>
            </div>
          )}

          {grouped.noDate.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.noDate} count={grouped.noDate.length} />
              <div className={workspaceSurfaceClassName}>
                <TodoSection
                  items={grouped.noDate}
                  emptyMessage="没有无截止日期的待办"
                  pendingIds={pendingIds}
                  onToggleTodo={handleToggleTodo}
                  onEdit={setEditingTodo}
                  onArchive={handleArchive}
                  onMoveToTrash={handleMoveToTrash}
                />
              </div>
            </div>
          )}

          {grouped.completed.length > 0 && (
            <div>
              <SectionHeader label={groupLabels.completed} count={grouped.completed.length} />
              <div className={workspaceSurfaceClassName}>
                <TodoSection
                  items={grouped.completed}
                  emptyMessage="没有已完成的待办"
                  pendingIds={pendingIds}
                  onToggleTodo={handleToggleTodo}
                  onEdit={setEditingTodo}
                  onArchive={handleArchive}
                  onMoveToTrash={handleMoveToTrash}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <AssetEditDialog
        asset={editingTodo}
        onOpenChange={(open) => {
          if (!open) setEditingTodo(null)
        }}
        onSubmit={submitEdit}
      />
    </>
  )
}
