import type { WorkspaceRunStage } from '@/shared/workspace/workspace-run.types'

export function WorkspaceRunPanel({
  stage,
  message,
}: {
  stage: WorkspaceRunStage
  message: string | null
}) {
  return (
    <section className="mb-8 rounded-3xl border border-border/10 bg-surface-container-lowest p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
        AI 正在处理
      </h2>
      <p className="mt-3 text-sm text-on-surface">
        {stage === 'understanding' && '正在理解你的需求'}
        {stage === 'executing' && '已选择合适的处理方式，正在执行'}
        {stage === 'finalizing' && '正在整理结果'}
      </p>
      {message ? <p className="mt-2 text-xs text-on-surface-variant/70">{message}</p> : null}
    </section>
  )
}
