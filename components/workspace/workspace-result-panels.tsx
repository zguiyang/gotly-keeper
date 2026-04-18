import { assetTypePresentation } from '@/config/ui/asset-presentation'
import {
  type AssetListItem,
  type BookmarkSummaryResult,
  type NoteSummaryResult,
  type TodoReviewResult,
} from '@/shared/assets/assets.types'
import { formatAbsoluteTime } from '@/shared/time/formatters'

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
    <div className="group -mx-2 rounded-sm border-t border-outline-variant/10 px-2 py-4 transition-colors duration-150 hover:bg-surface-container-low/50 focus-within:bg-surface-container-low/50">
      <div className="flex items-start gap-4">
        <div className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors truncate">
              {title}
            </h3>
            <span className="text-xs text-on-surface-variant flex-shrink-0">
              {time}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1 line-clamp-1 leading-relaxed">
            {excerpt}
          </p>
          <p className="text-xs text-on-surface-variant/60 mt-1">
            {timeText ? `${type} · ${timeText}` : type}
          </p>
        </div>
      </div>
    </div>
  )
}

export function WorkspaceQueryResultsPanel({
  query,
  results,
}: {
  query: string
  results: AssetListItem[]
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          查询结果
        </h2>
        <div className="flex-1 h-px bg-outline-variant/20" />
      </div>
        <p className="mb-3 text-xs text-on-surface-variant/60">
          {`"${query}"`}
        </p>
      {results.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          没有找到相关内容。可以换个关键词，或先在上方保存一条新记录。
        </p>
      ) : (
        <div>
          {results.map((asset) => {
            const presentation = assetTypePresentation[asset.type]
            return (
              <RecentItem
                key={asset.id}
                icon={presentation.icon}
                iconBg={presentation.iconBg}
                iconColor={presentation.iconColor}
                title={asset.title}
                excerpt={asset.excerpt}
                time={formatAbsoluteTime(asset.createdAt)}
                type={presentation.label}
                timeText={asset.timeText}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

type SummaryPanelBaseProps<TSource extends { id: string }> = {
  title: string
  headline: string
  summary: string
  points: string[]
  sources: TSource[]
  renderSourceText: (source: TSource) => React.ReactNode
  sourceTextClassName?: string
}

function SummaryPanelBase<TSource extends { id: string }>({
  title,
  headline,
  summary,
  points,
  sources,
  renderSourceText,
  sourceTextClassName,
}: SummaryPanelBaseProps<TSource>) {
  const sourceTextClass = sourceTextClassName
    ? `text-xs text-on-surface-variant/80 ${sourceTextClassName}`
    : 'text-xs text-on-surface-variant/80'

  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          {title}
        </h2>
        <div className="flex-1 h-px bg-outline-variant/20" />
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-on-surface">
          {headline}
        </h3>
        <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
          {summary}
        </p>
        {points.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {points.map((point, index) => (
              <li key={`${point}-${index}`} className="text-sm text-on-surface">
                {index + 1}. {point}
              </li>
            ))}
          </ul>
        ) : null}
        {sources.length > 0 ? (
          <div className="mt-4 pt-3 border-t border-outline-variant/10">
            <p className="text-xs font-medium text-on-surface-variant mb-2">
              来源
            </p>
            <div className="space-y-1">
              {sources.map((source) => (
                <p key={source.id} className={sourceTextClass}>
                  {renderSourceText(source)}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function WorkspaceTodoReviewPanel({ review }: { review: TodoReviewResult }) {
  return (
    <SummaryPanelBase
      title="待办复盘"
      headline={review.headline}
      summary={review.summary}
      points={review.nextActions}
      sources={review.sources}
      renderSourceText={(source) =>
        source.timeText ? `${source.title} · ${source.timeText}` : source.title
      }
    />
  )
}

export function WorkspaceNoteSummaryPanel({ summary }: { summary: NoteSummaryResult }) {
  return (
    <SummaryPanelBase
      title="笔记摘要"
      headline={summary.headline}
      summary={summary.summary}
      points={summary.keyPoints}
      sources={summary.sources}
      renderSourceText={(source) => source.title}
    />
  )
}

export function WorkspaceBookmarkSummaryPanel({ summary }: { summary: BookmarkSummaryResult }) {
  return (
    <SummaryPanelBase
      title="书签摘要"
      headline={summary.headline}
      summary={summary.summary}
      points={summary.keyPoints}
      sources={summary.sources}
      sourceTextClassName="break-words"
      renderSourceText={(source) =>
        source.url ? `${source.title} · ${source.url}` : source.title
      }
    />
  )
}
