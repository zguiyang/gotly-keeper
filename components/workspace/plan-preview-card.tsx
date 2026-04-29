'use client'

import { useState } from 'react'

import { workspacePillClassName, workspaceRunSectionClassName } from './workspace-view-primitives'

import type { ConfirmPlanInteraction, WorkspaceInteractionResponse } from '@/shared/workspace/workspace-run-protocol'

type PlanPreviewCardProps = {
  interaction: ConfirmPlanInteraction
  onSubmit?: (response: WorkspaceInteractionResponse) => void
}

export function PlanPreviewCard({ interaction }: PlanPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getToolNameLabel = (toolName: string) => {
    if (toolName === 'create_todo') return '创建待办'
    if (toolName === 'update_todo') return '更新待办'
    if (toolName === 'create_note') return '创建笔记'
    if (toolName === 'update_note') return '更新笔记'
    if (toolName === 'create_bookmark') return '创建书签'
    if (toolName === 'query_assets') return '查询资产'
    if (toolName === 'summarize_assets') return '总结资产'
    return toolName
  }

  const previewSteps = isExpanded
    ? interaction.plan.steps
    : interaction.plan.steps.slice(0, 2)

  return (
    <section className={workspaceRunSectionClassName}>
      <p className="text-sm text-on-surface-variant">{interaction.message}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={workspacePillClassName}>待你确认</span>
        <span className="text-sm font-medium text-on-surface">{interaction.plan.summary}</span>
      </div>

      <h3 className="text-xs font-semibold text-on-surface-variant">将执行</h3>
      <ol className="space-y-2">
        {previewSteps.map((step, index) => (
          <li key={step.id} className="rounded-[0.95rem] border border-border/10 bg-muted/35 px-3 py-2.5">
            <p className="text-xs font-medium text-on-surface-variant/75">
              {index + 1}. {getToolNameLabel(step.toolName)}
            </p>
            <p className="mt-1 text-sm font-medium text-on-surface">{step.title}</p>
            <p className="mt-1 text-sm text-on-surface">{step.preview}</p>
          </li>
        ))}
      </ol>

      {interaction.plan.steps.length > 2 ? (
        <div className="flex flex-wrap items-center gap-3">
          {!isExpanded ? (
            <p className="text-xs text-on-surface-variant/70">
              还有 {interaction.plan.steps.length - 2} 个动作会继续处理。
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            {isExpanded ? '收起步骤' : `查看全部 ${interaction.plan.steps.length} 步`}
          </button>
        </div>
      ) : null}
    </section>
  )
}
