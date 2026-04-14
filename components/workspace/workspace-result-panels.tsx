import {
  FileText,
  Link2,
  StickyNote,
} from 'lucide-react'
import {
  type AssetListItem,
  type AssetQueryResult,
  type BookmarkSummaryResult,
  type NoteSummaryResult,
  type TodoReviewResult,
} from '@/shared/assets/assets.types'

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
    <div className="group py-4 border-t border-outline-variant/10 cursor-pointer hover:bg-surface-container-low/50 focus-within:bg-surface-container-low/50 -mx-2 px-2 rounded-sm transition-colors duration-150">
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

export const assetTypePresentation = {
  note: { icon: FileText, iconBg: 'bg-primary/10', iconColor: 'text-primary', label: '笔记' },
  link: { icon: Link2, iconBg: 'bg-secondary/10', iconColor: 'text-secondary', label: '书签' },
  todo: { icon: StickyNote, iconBg: 'bg-tertiary/10', iconColor: 'text-tertiary', label: '待办' },
}

export function formatAssetTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
      <p className="text-xs text-on-surface-variant/60 mb-3">
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
                time={formatAssetTime(new Date(asset.createdAt))}
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

export function WorkspaceTodoReviewPanel({ review }: { review: TodoReviewResult }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          待办复盘
        </h2>
        <div className="flex-1 h-px bg-outline-variant/20" />
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-on-surface">
          {review.headline}
        </h3>
        <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
          {review.summary}
        </p>
        {review.nextActions.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {review.nextActions.map((action, index) => (
              <li key={`${action}-${index}`} className="text-sm text-on-surface">
                {index + 1}. {action}
              </li>
            ))}
          </ul>
        ) : null}
        {review.sources.length > 0 ? (
          <div className="mt-4 pt-3 border-t border-outline-variant/10">
            <p className="text-xs font-medium text-on-surface-variant mb-2">
              来源
            </p>
            <div className="space-y-1">
              {review.sources.map((source) => (
                <p key={source.id} className="text-xs text-on-surface-variant/80">
                  {source.timeText ? `${source.title} · ${source.timeText}` : source.title}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function WorkspaceNoteSummaryPanel({ summary }: { summary: NoteSummaryResult }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          笔记摘要
        </h2>
        <div className="flex-1 h-px bg-outline-variant/20" />
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-on-surface">
          {summary.headline}
        </h3>
        <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
          {summary.summary}
        </p>
        {summary.keyPoints.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {summary.keyPoints.map((point, index) => (
              <li key={`${point}-${index}`} className="text-sm text-on-surface">
                {index + 1}. {point}
              </li>
            ))}
          </ul>
        ) : null}
        {summary.sources.length > 0 ? (
          <div className="mt-4 pt-3 border-t border-outline-variant/10">
            <p className="text-xs font-medium text-on-surface-variant mb-2">
              来源
            </p>
            <div className="space-y-1">
              {summary.sources.map((source) => (
                <p key={source.id} className="text-xs text-on-surface-variant/80">
                  {source.title}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function WorkspaceBookmarkSummaryPanel({ summary }: { summary: BookmarkSummaryResult }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          书签摘要
        </h2>
        <div className="flex-1 h-px bg-outline-variant/20" />
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-on-surface">
          {summary.headline}
        </h3>
        <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
          {summary.summary}
        </p>
        {summary.keyPoints.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {summary.keyPoints.map((point, index) => (
              <li key={`${point}-${index}`} className="text-sm text-on-surface">
                {index + 1}. {point}
              </li>
            ))}
          </ul>
        ) : null}
        {summary.sources.length > 0 ? (
          <div className="mt-4 pt-3 border-t border-outline-variant/10">
            <p className="text-xs font-medium text-on-surface-variant mb-2">
              来源
            </p>
            <div className="space-y-1">
              {summary.sources.map((source) => (
                <p key={source.id} className="text-xs text-on-surface-variant/80 break-words">
                  {source.url ? `${source.title} · ${source.url}` : source.title}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}