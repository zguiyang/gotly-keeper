import {
  workspaceMetaTextClassName,
  workspacePillClassName,
  WorkspacePageHeader,
  workspaceSurfaceClassName,
} from '@/components/workspace/workspace-view-primitives'

const skeletonHeights = [220, 288, 246, 312, 232, 272, 298]

function LoadingCard({ height }: { height: number }) {
  return (
    <article
      className={`${workspaceSurfaceClassName} mb-4 break-inside-avoid overflow-hidden rounded-2xl border-border/20 bg-surface-container-lowest p-0 md:mb-5 xl:mb-6`}
      style={{ minHeight: `${height}px` }}
    >
      <div className="flex items-center gap-3 border-b border-dashed border-border/20 px-4 py-3 md:px-5">
        <div className="h-3 w-[4.5rem] rounded-full bg-muted" />
        <div className="ml-auto h-3 w-14 rounded-full bg-muted" />
      </div>

      <div className="space-y-3 px-4 py-4 md:px-5 md:py-5">
        <div className="h-6 w-3/5 rounded-md bg-muted" />
        <div className="h-4 w-full rounded-md bg-muted" />
        <div className="h-4 w-11/12 rounded-md bg-muted" />
        <div className="h-4 w-4/5 rounded-md bg-muted" />
      </div>

      <div className="mt-auto border-t border-border/10 px-4 py-3 md:px-5">
        <div className="h-3 w-32 rounded-full bg-muted" />
      </div>
    </article>
  )
}

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-1 sm:px-2">
      <WorkspacePageHeader title="笔记" eyebrow="Workspace" description="正在加载你的笔记内容…" />

      <div className="mb-7 flex flex-wrap items-center gap-3 md:mb-8">
        <span className={workspacePillClassName}>加载中</span>
        <p className={`${workspaceMetaTextClassName} text-on-surface-variant`}>
          正在准备笔记卡片布局…
        </p>
      </div>

      <div className="columns-1 gap-4 [column-gap:1rem] md:columns-2 md:[column-gap:1.25rem] xl:columns-3 xl:[column-gap:1.5rem]">
        {skeletonHeights.map((height, index) => (
          <LoadingCard key={`${height}-${index}`} height={height} />
        ))}
      </div>
    </div>
  )
}
