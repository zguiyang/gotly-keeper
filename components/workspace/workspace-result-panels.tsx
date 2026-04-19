import {
  type AssetListItem,
  type BookmarkSummaryResult,
  type NoteSummaryResult,
  type TodoReviewResult,
} from '@/shared/assets/assets.types'

import { WorkspaceActionableAssetList } from './workspace-actionable-assets'
import {
  workspaceMetaTextClassName,
  workspacePillClassName,
} from './workspace-view-primitives'

export function RecentItem({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  excerpt,
  time,
  type,
  timeText,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  excerpt: string
  time: string
  type: string
  timeText?: string | null
}) {
  return (
    <div className="group -mx-3 rounded-2xl border-t border-border/10 px-3 py-4 transition-colors duration-150 hover:bg-muted/45 focus-within:bg-muted/45">
      <div className="flex items-start gap-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold leading-6 text-on-surface transition-colors group-hover:text-primary">
              {title}
            </h3>
            <span className={`${workspaceMetaTextClassName} shrink-0`}>
              {time}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-sm leading-6 text-on-surface-variant">
            {excerpt}
          </p>
          <p className="mt-2">
            <span className={workspacePillClassName}>
            {timeText ? `${type} · ${timeText}` : type}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function WorkspaceQueryResultsPanel({
  results,
}: {
  results: AssetListItem[]
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          查询结果
        </h2>
        <div className="flex-1 h-px bg-border/20" />
      </div>
      <WorkspaceActionableAssetList
        assets={results}
        emptyMessage="没有找到相关内容。可以换个关键词，或先在上方保存一条新记录。"
      />
    </section>
  )
}

type SummaryPanelBaseProps = {
  title: string
  sources: AssetListItem[]
  emptyMessage: string
}

function SummaryPanelBase({
  title,
  sources,
  emptyMessage,
}: SummaryPanelBaseProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          {title}
        </h2>
        <div className="flex-1 h-px bg-border/20" />
      </div>
      <WorkspaceActionableAssetList
        assets={sources}
        emptyMessage={emptyMessage}
      />
    </section>
  )
}

export function WorkspaceTodoReviewPanel({ review }: { review: TodoReviewResult }) {
  return (
    <SummaryPanelBase
      title="待办复盘"
      sources={review.sources}
      emptyMessage="没有可操作的待办。"
    />
  )
}

export function WorkspaceNoteSummaryPanel({ summary }: { summary: NoteSummaryResult }) {
  return (
    <SummaryPanelBase
      title="笔记摘要"
      sources={summary.sources}
      emptyMessage="没有可操作的笔记。"
    />
  )
}

export function WorkspaceBookmarkSummaryPanel({ summary }: { summary: BookmarkSummaryResult }) {
  return (
    <SummaryPanelBase
      title="书签摘要"
      sources={summary.sources}
      emptyMessage="没有可操作的书签。"
    />
  )
}
