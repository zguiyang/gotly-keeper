import {
  workspaceMetaTextClassName,
  WorkspacePageHeader,
  workspacePillClassName,
  workspaceCriticalSurfaceClassName,
  workspaceListSurfaceClassName,
  workspacePanelSurfaceClassName,
  workspaceSurfaceClassName,
} from '@/components/workspace/workspace-view-primitives'
import { cn } from '@/lib/utils'

type LifecycleLoadingMode = 'archive' | 'trash'

const timelineGroups = [
  { label: '今天', hint: '最近 24 小时', rows: ['w-7/12', 'w-5/6'] },
  { label: '昨天', hint: '前一天', rows: ['w-2/3', 'w-4/5'] },
  { label: '更早', hint: '更久以前', rows: ['w-3/5'] },
]

const lifecycleContent = {
  archive: {
    eyebrow: '已收起',
    title: '归档',
    description: '正在整理已归档内容，恢复入口马上就绪…',
    summary: '正在整理已归档内容',
    tone: 'default',
  },
  trash: {
    eyebrow: '待确认',
    title: '回收站',
    description: '正在检查待清理内容，恢复与永久删除操作稍后可用…',
    summary: '正在检查待清理内容',
    tone: 'critical',
  },
} satisfies Record<LifecycleLoadingMode, {
  eyebrow: string
  title: string
  description: string
  summary: string
  tone: 'default' | 'critical'
}>

function PulseBlock({ className }: { className: string }) {
  return <span className={cn('block rounded-md bg-muted', className)} />
}

function LoadingShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-1 sm:px-2', className)}>
      <div className="animate-pulse motion-reduce:animate-none">{children}</div>
    </div>
  )
}

function LoadingPills({ children }: { children: React.ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-center gap-3 md:mb-8">{children}</div>
}

function SummaryLoadingBar() {
  return (
    <div className={`${workspaceSurfaceClassName} flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-8 w-1 rounded-full bg-primary/35" />
        <div className="min-w-0 space-y-2">
          <PulseBlock className="h-4 w-48" />
          <PulseBlock className="h-3 w-64 max-w-full" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <PulseBlock className="h-7 w-20 rounded-full" />
        <PulseBlock className="h-7 w-20 rounded-full" />
        <PulseBlock className="h-7 w-20 rounded-full" />
      </div>
    </div>
  )
}

function FilterTabsLoading() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2.5 border-y border-border/10 py-4">
      <PulseBlock className="h-8 w-16 rounded-full" />
      <PulseBlock className="h-8 w-16 rounded-full" />
      <PulseBlock className="h-8 w-16 rounded-full" />
      <PulseBlock className="h-8 w-16 rounded-full" />
    </div>
  )
}

function TimelineItemLoading({ widthClassName }: { widthClassName: string }) {
  return (
    <article className="w-full rounded-[14px] border border-border/18 bg-surface-container-lowest/85 px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <PulseBlock className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <PulseBlock className={cn('h-5', widthClassName)} />
          <PulseBlock className="h-4 w-full" />
          <PulseBlock className="h-4 w-4/5" />
          <div className="flex flex-wrap gap-2.5 pt-1">
            <PulseBlock className="h-5 w-20 rounded-full" />
            <PulseBlock className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
    </article>
  )
}

function TimelineGroupLoading({
  label,
  hint,
  rows,
}: {
  label: string
  hint: string
  rows: string[]
}) {
  return (
    <section className="grid w-full min-w-0 gap-3 md:grid-cols-[7rem_minmax(0,1fr)] md:gap-5">
      <div className="relative flex min-w-0 items-center justify-between gap-3 md:block md:pt-1">
        <div className="flex items-center gap-2 md:items-start">
          <span className="relative flex size-3 shrink-0 items-center justify-center">
            <span className="size-2 rounded-full bg-primary/35 ring-4 ring-surface-container-lowest" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface">{label}</p>
            <p className="text-[11px] text-on-surface-variant/75">{hint}</p>
          </div>
        </div>
        <span className={workspacePillClassName}>加载中</span>
        <span className="hidden md:absolute md:left-[0.35rem] md:top-7 md:block md:h-full md:w-px md:bg-border/10" />
      </div>

      <div className="min-w-0 space-y-2">
        {rows.map((widthClassName, index) => (
          <TimelineItemLoading key={`${label}-${widthClassName}-${index}`} widthClassName={widthClassName} />
        ))}
      </div>
    </section>
  )
}

function TodoItemLoading({ widthClassName = 'w-3/5' }: { widthClassName?: string }) {
  return (
    <article className={cn(workspaceListSurfaceClassName, 'flex items-start gap-3 px-3 py-3.5 sm:px-4')}>
      <PulseBlock className="mt-0.5 size-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <PulseBlock className={cn('h-5', widthClassName)} />
        <PulseBlock className="h-4 w-32 rounded-full" />
        <PulseBlock className="h-4 w-4/5" />
      </div>
    </article>
  )
}

function TodoListLoading({
  title = '当天待办',
  description = '正在同步当前日期的待办。',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className={`${workspaceSurfaceClassName} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b border-border/8 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="font-headline text-base font-semibold text-on-surface">{title}</h3>
          <p className="mt-0.5 text-[12px] leading-5 text-on-surface-variant/75">{description}</p>
        </div>
        <span className={cn(workspaceMetaTextClassName, 'rounded-full border border-border/10 bg-muted/35 px-2.5 py-1')}>
          加载中
        </span>
      </div>
      <div className="space-y-2.5 p-3 sm:p-4">
        <TodoItemLoading widthClassName="w-7/12" />
        <TodoItemLoading widthClassName="w-3/5" />
        <TodoItemLoading widthClassName="w-2/3" />
      </div>
    </div>
  )
}

function CalendarPanelLoading() {
  return (
    <aside className={cn(workspacePanelSurfaceClassName, 'p-4 sm:p-5 xl:sticky xl:top-24')}>
      <div className="mb-4 space-y-2">
        <p className="text-[12px] font-semibold tracking-normal text-on-surface-variant/80">日历</p>
        <PulseBlock className="h-6 w-28" />
        <PulseBlock className="h-4 w-44" />
      </div>

      <div className="mx-auto grid w-full max-w-[20rem] grid-cols-7 gap-2">
        {Array.from({ length: 35 }, (_, index) => (
          <PulseBlock key={index} className="aspect-square rounded-full" />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <PulseBlock className="h-16 rounded-xl" />
        <PulseBlock className="h-16 rounded-xl" />
        <PulseBlock className="h-16 rounded-xl" />
      </div>
    </aside>
  )
}

function LifecycleItemLoading({
  tone,
  widthClassName,
}: {
  tone: 'default' | 'critical'
  widthClassName: string
}) {
  return (
    <article
      className={cn(
        tone === 'critical' ? workspaceCriticalSurfaceClassName : workspaceListSurfaceClassName,
        'overflow-hidden'
      )}
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between md:gap-5">
        <div className="flex min-w-0 flex-1 gap-3.5 sm:gap-4">
          <PulseBlock className="size-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap gap-2.5">
              <PulseBlock className="h-6 w-14 rounded-full" />
              <PulseBlock className="h-6 w-32 rounded-full" />
            </div>
            <PulseBlock className={cn('h-6', widthClassName)} />
            <PulseBlock className="h-4 w-full" />
            <PulseBlock className="h-4 w-4/5" />
            <PulseBlock className="h-4 w-56 max-w-full rounded-full" />
          </div>
        </div>
        <div className="flex shrink-0 gap-2 md:flex-col">
          <PulseBlock className="h-9 w-24 rounded-full" />
          <PulseBlock className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </article>
  )
}

function LifecycleSummaryLoading({
  summary,
  tone,
}: {
  summary: string
  tone: 'default' | 'critical'
}) {
  return (
    <div className={cn(workspacePanelSurfaceClassName, 'flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between')}>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full',
              tone === 'critical' ? 'bg-destructive/10' : 'bg-primary/12'
            )}
          >
            <span className={cn('size-3 rounded-full', tone === 'critical' ? 'bg-destructive/45' : 'bg-primary/45')} />
          </span>
          <span>{summary}</span>
        </p>
        {tone === 'critical' ? (
          <div className="rounded-xl border border-destructive/24 bg-destructive/8 px-3 py-2">
            <PulseBlock className="h-4 w-80 max-w-full bg-destructive/15" />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2.5">
        <PulseBlock className="h-8 w-16 rounded-full" />
        <PulseBlock className="h-8 w-16 rounded-full" />
        <PulseBlock className="h-8 w-16 rounded-full" />
        <PulseBlock className="h-8 w-16 rounded-full" />
      </div>
    </div>
  )
}

function WorkspaceAllLoading() {
  return (
    <LoadingShell>
      <section className="mb-8 sm:mb-10">
        <WorkspacePageHeader
          title="知识库"
          eyebrow="全部内容"
          description="时间线同步中，最近捕获的笔记、书签和待办马上出现…"
          className="mb-6"
        />
        <SummaryLoadingBar />
        <FilterTabsLoading />
      </section>

      <div className="w-full max-w-6xl min-w-0 space-y-6 overflow-hidden">
        {timelineGroups.map((group) => (
          <TimelineGroupLoading key={group.label} label={group.label} hint={group.hint} rows={group.rows} />
        ))}
      </div>
    </LoadingShell>
  )
}

function WorkspaceTodosDateLoading() {
  return <TodoListLoading title="任务列表同步中" description="正在加载这一天的待办。" />
}

function WorkspaceTodosLoading() {
  return (
    <LoadingShell>
      <WorkspacePageHeader
        title="待办"
        description="日历同步中，按日期整理的任务流马上就绪…"
        eyebrow="任务计划"
      />

      <LoadingPills>
        <span className={workspacePillClassName}>加载中</span>
        <span className={workspacePillClassName}>日历同步中</span>
        <p className={`${workspaceMetaTextClassName} text-on-surface-variant`}>任务列表与日期标记正在准备。</p>
      </LoadingPills>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="max-w-3xl space-y-8">
          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-[12px] font-semibold tracking-normal text-on-surface-variant/80">任务日</p>
                <PulseBlock className="h-8 w-40" />
                <PulseBlock className="h-4 w-80 max-w-full" />
              </div>
              <PulseBlock className="h-9 w-72 max-w-full rounded-2xl" />
            </div>
            <WorkspaceTodosDateLoading />
          </section>

          <TodoListLoading title="未排期待办" description="暂时没有具体日期时间的待办也在同步。" />
        </div>

        <CalendarPanelLoading />
      </div>
    </LoadingShell>
  )
}

function WorkspaceLifecycleLoading({ mode }: { mode: LifecycleLoadingMode }) {
  const content = lifecycleContent[mode]

  return (
    <LoadingShell className="max-w-6xl">
      <section className="mb-6 sm:mb-8">
        <WorkspacePageHeader
          title={content.title}
          eyebrow={content.eyebrow}
          description={content.description}
          className="mb-6"
        />
        <LifecycleSummaryLoading summary={content.summary} tone={content.tone} />
      </section>

      <div className="space-y-2.5">
        <LifecycleItemLoading tone={content.tone} widthClassName="w-7/12" />
        <LifecycleItemLoading tone={content.tone} widthClassName="w-2/3" />
        <LifecycleItemLoading tone={content.tone} widthClassName="w-3/5" />
        <LifecycleItemLoading tone={content.tone} widthClassName="w-4/5" />
      </div>
    </LoadingShell>
  )
}

export {
  WorkspaceAllLoading,
  WorkspaceLifecycleLoading,
  WorkspaceTodosDateLoading,
  WorkspaceTodosLoading,
}
