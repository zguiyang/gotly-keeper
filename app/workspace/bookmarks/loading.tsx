import {
  workspaceMetaTextClassName,
  workspacePillClassName,
  WorkspacePageHeader,
  workspaceSurfaceClassName,
} from '@/components/workspace/workspace-view-primitives'

const skeletonWidths = ['w-1/2', 'w-2/3', 'w-3/5', 'w-4/5', 'w-[55%]']

function BookmarkSkeleton({ widthClassName }: { widthClassName: string }) {
  return (
    <article className={`${workspaceSurfaceClassName} rounded-2xl border-border/20 bg-surface-container-lowest p-4 md:p-5`}>
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span className="h-6 w-24 rounded-full bg-muted" />
        <span className="h-6 w-14 rounded-full bg-muted" />
        <span className="ml-auto h-3 w-16 rounded-full bg-muted" />
      </div>

      <div className="space-y-3">
        <div className={`h-6 rounded-md bg-muted ${widthClassName}`} />
        <div className="h-4 w-full rounded-md bg-muted" />
        <div className="h-4 w-11/12 rounded-md bg-muted" />
        <div className="h-4 w-4/5 rounded-md bg-muted" />
      </div>

      <div className="mt-4 h-4 w-2/3 rounded-md bg-muted" />
    </article>
  )
}

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-1 sm:px-2">
      <WorkspacePageHeader title="我的收藏" eyebrow="阅读队列" description="正在加载你的链接收藏与解析状态…" />

      <div className="mb-7 flex flex-wrap items-center gap-3 md:mb-8">
        <span className={workspacePillClassName}>加载中</span>
        <span className={workspacePillClassName}>解析状态同步中</span>
        <p className={`${workspaceMetaTextClassName} text-on-surface-variant`}>稍等片刻，卡片内容马上出现。</p>
      </div>

      <div className="max-w-6xl space-y-3">
        {skeletonWidths.map((widthClassName, index) => (
          <BookmarkSkeleton key={`${widthClassName}-${index}`} widthClassName={widthClassName} />
        ))}
      </div>
    </div>
  )
}
