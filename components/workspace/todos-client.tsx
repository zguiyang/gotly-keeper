'use client'

import { addMonths, format, isSameDay, startOfDay, startOfMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Check, Circle, Clock } from 'lucide-react'
import { useMemo, useState, type ComponentProps } from 'react'

import {
  loadWorkspaceTodoDateMarkers,
  loadWorkspaceTodosByDate,
} from '@/client/actions/workspace-actions.client'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import { AssetActionMenu } from '@/components/workspace/asset-action-menu'
import { AssetEditDialog, type AssetEditValues } from '@/components/workspace/asset-edit-dialog'
import {
  WorkspaceEmptyState,
  workspaceMetaTextClassName,
  WorkspacePageHeader,
  workspaceSurfaceClassName,
} from '@/components/workspace/workspace-view-primitives'
import { useAssetMutations } from '@/hooks/workspace/use-asset-mutations'
import { useTodoCompletion } from '@/hooks/workspace/use-todo-completion'
import { type AssetListItem } from '@/shared/assets/assets.types'

function getDateKey(date: Date) {
  return format(startOfDay(date), 'yyyy-MM-dd')
}

function getTodoDate(item: AssetListItem) {
  if (!item.dueAt) return null

  const dueAt = new Date(item.dueAt)
  if (Number.isNaN(dueAt.getTime())) return null

  return dueAt
}

function getSelectedDateLabel(date: Date) {
  if (isSameDay(date, new Date())) return '今天'
  return format(date, 'M月d日 EEEE', { locale: zhCN })
}

function TodoDateHeader({
  selectedDate,
  selectedCount,
  scheduledCount,
}: {
  selectedDate: Date
  selectedCount: number
  scheduledCount: number
}) {
  const label = getSelectedDateLabel(selectedDate)

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/75">Selected Day</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="font-headline text-2xl font-semibold text-on-surface">{label}</h2>
          <span className={workspaceMetaTextClassName}>{selectedCount} 项</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant/75">
          只显示有明确日期时间的待办，未排期事项放在下方单独处理。
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-border/10 bg-muted/45 px-3 py-1.5 text-[12px] text-on-surface-variant">
        <span className="size-2 rounded-full bg-primary" />
        已排期 {scheduledCount} 项
      </div>
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
  const note = item.excerpt !== item.title ? item.excerpt : null

  return (
    <article
      className={`group -mx-2 flex items-start justify-between gap-3 rounded-xl px-2.5 py-3.5 transition-[background-color,opacity,transform] duration-150 hover:bg-surface-container-lowest/80 sm:-mx-3 sm:px-3 ${
        item.completed ? 'opacity-80' : 'hover:-translate-y-px'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <Button
          type="button"
          onClick={() => onToggle(item)}
          disabled={pending}
          variant="ghost"
          size="icon-sm"
          className={`mt-0.5 shrink-0 rounded-full ring-1 ring-border/10 ${
            item.completed
              ? 'bg-primary/8 text-primary hover:bg-primary/10 hover:text-primary'
              : 'bg-muted/55 text-on-surface-variant/75 hover:bg-primary/8 hover:text-primary'
          }`}
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
            className={`text-[16px] font-semibold leading-7 tracking-normal sm:text-[17px] ${
              item.completed
                ? 'text-on-surface-variant line-through decoration-on-surface-variant/45'
                : 'text-on-surface'
            }`}
          >
            {item.title}
          </h4>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-on-surface-variant/80">
            <span className="inline-flex h-6 items-center gap-1 rounded-full border border-border/10 bg-muted/45 px-2">
              <Clock className="size-3" />
              {item.timeText || '无截止日期'}
            </span>
          </div>
          {note ? (
            <p className="max-w-3xl text-sm leading-6 text-on-surface-variant line-clamp-2">{note}</p>
          ) : null}
        </div>
      </div>
      <div className="pt-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <AssetActionMenu
          actions={[
            { label: '编辑', onClick: () => onEdit(item), disabled: pending },
            { label: '归档', onClick: () => onArchive(item), disabled: pending },
            { label: '移入回收站', onClick: () => onMoveToTrash(item), disabled: pending, danger: true },
          ]}
        />
      </div>
    </article>
  )
}

function TodoDateList({
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
      <div className={`${workspaceSurfaceClassName} flex min-h-[17rem] items-center justify-center p-8 text-center`}>
        <div className="max-w-sm">
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/7 text-primary">
            <Check className="size-5" />
          </div>
          <p className="mt-4 text-base font-semibold text-on-surface">这一天很清爽</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant/75">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${workspaceSurfaceClassName} border-primary/12 bg-primary/4`}>
      <TodoSection
        items={items}
        emptyMessage={emptyMessage}
        pendingIds={pendingIds}
        onToggleTodo={onToggleTodo}
        onEdit={onEdit}
        onArchive={onArchive}
        onMoveToTrash={onMoveToTrash}
      />
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
        <p className="text-sm text-on-surface-variant/75">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-0 p-2 sm:p-3">
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
          {index < items.length - 1 && <Separator className="mx-3 bg-border/10" />}
        </div>
      ))}
    </div>
  )
}

function TodoCalendarPanel({
  selectedDate,
  scheduledDateKeys,
  scheduledCount,
  unscheduledCount,
  onSelectDate,
  onMonthChange,
}: {
  selectedDate: Date
  scheduledDateKeys: Set<string>
  scheduledCount: number
  unscheduledCount: number
  onSelectDate: (date: Date) => void
  onMonthChange: (month: Date) => void
}) {
  function DayButtonWithTodoMarker(props: ComponentProps<typeof CalendarDayButton>) {
    const hasTodo = scheduledDateKeys.has(getDateKey(props.day.date))

    return (
      <CalendarDayButton {...props}>
        {props.children}
        {hasTodo ? <span className="mt-0.5 size-1.5 rounded-full bg-current opacity-80" /> : null}
      </CalendarDayButton>
    )
  }

  return (
    <aside className={`${workspaceSurfaceClassName} p-4 sm:p-5 xl:sticky xl:top-24`}>
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/75">Calendar</p>
        <h2 className="mt-2 font-headline text-xl font-semibold text-on-surface">按日期查看</h2>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant/75">有圆点的日期表示当天存在待办。</p>
      </div>

      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => {
          if (date) onSelectDate(date)
        }}
        onMonthChange={onMonthChange}
        locale={zhCN}
        className="mx-auto w-full max-w-[20rem] bg-transparent p-0 [--cell-size:--spacing(9)] sm:[--cell-size:--spacing(10)] xl:[--cell-size:--spacing(8)]"
        components={{ DayButton: DayButtonWithTodoMarker }}
      />

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-border/10 bg-muted/35 px-3 py-3">
          <p className={workspaceMetaTextClassName}>已排期</p>
          <p className="mt-1 font-mono text-xl font-semibold leading-none text-on-surface tabular-nums">
            {scheduledCount}
          </p>
        </div>
        <div className="rounded-xl border border-border/10 bg-muted/35 px-3 py-3">
          <p className={workspaceMetaTextClassName}>未排期</p>
          <p className="mt-1 font-mono text-xl font-semibold leading-none text-on-surface tabular-nums">
            {unscheduledCount}
          </p>
        </div>
      </div>
    </aside>
  )
}

export function TodosClient({
  selectedDate: initialSelectedDate,
  initialSelectedDateTodos,
  initialDateMarkers,
  initialUnscheduledTodos,
}: {
  selectedDate: string
  initialSelectedDateTodos: AssetListItem[]
  initialDateMarkers: string[]
  initialUnscheduledTodos: AssetListItem[]
}) {
  const [selectedDateTodos, setSelectedDateTodos] = useState(initialSelectedDateTodos)
  const [dateMarkers, setDateMarkers] = useState(initialDateMarkers)
  const [unscheduledTodos, setUnscheduledTodos] = useState(initialUnscheduledTodos)
  const [loadingDate, setLoadingDate] = useState(false)
  const [editingTodo, setEditingTodo] = useState<AssetListItem | null>(null)

  const { updateAsset, archiveAsset, moveToTrash, isPending } = useAssetMutations()
  const { state, toggleCompletion } = useTodoCompletion()
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date(`${initialSelectedDate}T00:00:00`)))
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(selectedDate))

  const selectedItems = selectedDateTodos
  const unscheduledItems = unscheduledTodos
  const scheduledDateKeys = useMemo(
    () => new Set(dateMarkers),
    [dateMarkers]
  )
  const showEmptyState = selectedDateTodos.length === 0 && unscheduledTodos.length === 0

  function replaceItem(updated: AssetListItem) {
    const todoDate = getTodoDate(updated)

    setSelectedDateTodos((current) => {
      const withoutUpdated = current.filter((item) => item.id !== updated.id)
      return todoDate && isSameDay(todoDate, selectedDate) ? [updated, ...withoutUpdated] : withoutUpdated
    })

    setUnscheduledTodos((current) => {
      const withoutUpdated = current.filter((item) => item.id !== updated.id)
      return todoDate ? withoutUpdated : [updated, ...withoutUpdated]
    })
  }

  async function refreshMarkers(month = calendarMonth) {
    const startsAt = startOfMonth(month)
    const endsAt = startOfMonth(addMonths(month, 1))
    const markers = await loadWorkspaceTodoDateMarkers({ startsAt, endsAt })
    setDateMarkers(markers)
  }

  async function handleSelectDate(date: Date) {
    const nextDate = startOfDay(date)
    setSelectedDate(nextDate)
    setLoadingDate(true)
    try {
      const todos = await loadWorkspaceTodosByDate({ date: getDateKey(nextDate) })
      setSelectedDateTodos(todos)
    } finally {
      setLoadingDate(false)
    }
  }

  async function handleMonthChange(month: Date) {
    const nextMonth = startOfMonth(month)
    setCalendarMonth(nextMonth)
    await refreshMarkers(nextMonth)
  }

  async function handleToggleTodo(item: AssetListItem) {
    const updated = await toggleCompletion(item.id, !item.completed)
    if (updated) {
      replaceItem(updated)
    }
  }

  async function submitEdit(
    item: AssetListItem,
    values: AssetEditValues
  ) {
    if (!('timeText' in values) || !('content' in values)) {
      return false
    }

    const updated = await updateAsset({
      assetId: item.id,
      assetType: 'todo',
      rawInput: values.rawInput,
      title: values.title,
      content: values.content,
      ...(values.timeText !== undefined
        ? {
            timeText: values.timeText,
            dueAt: values.timeText === item.timeText ? item.dueAt : null,
          }
        : {}),
    })
    if (updated) {
      replaceItem(updated)
      await refreshMarkers()
    }
    return !!updated
  }

  async function handleArchive(item: AssetListItem) {
    const updated = await archiveAsset(item.id, item.type, {
      onUndo: (restored) => {
        replaceItem(restored)
        void refreshMarkers()
      },
    })
    if (updated) {
      setSelectedDateTodos((current) => current.filter((entry) => entry.id !== updated.id))
      setUnscheduledTodos((current) => current.filter((entry) => entry.id !== updated.id))
      await refreshMarkers()
    }
  }

  async function handleMoveToTrash(item: AssetListItem) {
    const updated = await moveToTrash(item.id, item.type, {
      onUndo: (restored) => {
        replaceItem(restored)
        void refreshMarkers()
      },
    })
    if (updated) {
      setSelectedDateTodos((current) => current.filter((entry) => entry.id !== updated.id))
      setUnscheduledTodos((current) => current.filter((entry) => entry.id !== updated.id))
      await refreshMarkers()
    }
  }

  const pendingIds = new Set<string>()
  if (state.pendingId) {
    pendingIds.add(state.pendingId)
  }
  for (const item of [...selectedDateTodos, ...unscheduledTodos]) {
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
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
          <div className="max-w-3xl space-y-8">
            <section>
              <TodoDateHeader
                selectedDate={selectedDate}
                selectedCount={selectedItems.length}
                scheduledCount={dateMarkers.length}
              />
              {loadingDate ? (
                <div className={`${workspaceSurfaceClassName} flex min-h-[17rem] items-center justify-center p-8 text-sm text-on-surface-variant/75`}>
                  正在加载这一天的待办...
                </div>
              ) : (
                <TodoDateList
                  items={selectedItems}
                  emptyMessage="这个日期没有已排期待办。可以点选带圆点的日期快速切换。"
                  pendingIds={pendingIds}
                  onToggleTodo={handleToggleTodo}
                  onEdit={setEditingTodo}
                  onArchive={handleArchive}
                  onMoveToTrash={handleMoveToTrash}
                />
              )}
            </section>

            {unscheduledItems.length > 0 ? (
              <section>
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-8 w-1 rounded-full bg-on-surface-variant/35" />
                  <div>
                    <h2 className="font-headline text-base font-semibold text-on-surface">未排期</h2>
                    <p className="mt-0.5 text-[12px] leading-5 text-on-surface-variant/70">
                      暂时没有具体日期时间的待办
                    </p>
                  </div>
                </div>
                <div className={`${workspaceSurfaceClassName} bg-muted/30`}>
                  <TodoSection
                    items={unscheduledItems}
                    emptyMessage="没有未排期待办"
                    pendingIds={pendingIds}
                    onToggleTodo={handleToggleTodo}
                    onEdit={setEditingTodo}
                    onArchive={handleArchive}
                    onMoveToTrash={handleMoveToTrash}
                  />
                </div>
              </section>
            ) : null}
          </div>

          <TodoCalendarPanel
            selectedDate={selectedDate}
            scheduledDateKeys={scheduledDateKeys}
            scheduledCount={dateMarkers.length}
            unscheduledCount={unscheduledItems.length}
            onSelectDate={(date) => void handleSelectDate(date)}
            onMonthChange={(month) => void handleMonthChange(month)}
          />
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
