import { WorkspacePageHeader } from '@/components/workspace/workspace-view-primitives'
import { cn } from '@/lib/utils'

const metadataTextClassName = 'text-[12px] tracking-wide text-on-surface-variant/75'
const workspacePillClassName =
  'inline-flex items-center gap-1.5 rounded-full border border-border/12 bg-surface-container-lowest px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-on-surface-variant/85'
const workspaceMetaTextClassName = 'text-[11px] tracking-wide text-on-surface-variant/65'

export default function NotesPageLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-6 pb-12 pt-8">
      {/* Page header skeleton */}
      <WorkspacePageHeader
        title="Notes"
        eyebrow="Drafts"
        description="Loading your notes..."
      />

      {/* Quick pill */}
      <div className="flex items-center gap-2">
        <span className={workspacePillClassName}>Loading</span>
      </div>

      {/* Note card skeleton */}
      <div className="flex animate-pulse flex-col gap-4 rounded-2xl border border-border/12 bg-surface-container-lowest p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted/40" />
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-40 rounded-md bg-muted/40" />
            <div className="h-3 w-24 rounded-md bg-muted/40" />
          </div>
        </div>
        <div className="h-4 w-full rounded-md bg-muted/30" />
        <div className="h-4 w-3/4 rounded-md bg-muted/30" />
        <div className="h-4 w-1/2 rounded-md bg-muted/30" />
      </div>
    </div>
  )
}
