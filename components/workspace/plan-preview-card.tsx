'use client'

// DESIGN_TOKEN_EXCEPTION: Warm modern accent colors (amber) are intentionally raw for step indicators

import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import {
  workspaceInteractionBodyTextClassName,
  workspaceInteractionCardClassName,
} from './workspace-view-primitives'

import type { ConfirmPlanInteraction } from '@/shared/workspace/workspace-run-protocol'

type PlanPreviewCardProps = {
  interaction: ConfirmPlanInteraction
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
    <div className={workspaceInteractionCardClassName}>
      <div className="space-y-3 px-5 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] font-medium tracking-normal">
            待确认执行
          </Badge>
          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px] font-medium tracking-normal">
            {interaction.plan.steps.length} 个动作
          </Badge>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-on-surface">{interaction.plan.summary}</p>
          <p className={workspaceInteractionBodyTextClassName}>
            {interaction.message}
          </p>
        </div>
      </div>

      <Separator className="mx-5 my-3 w-auto bg-border/10" />

      <div className="flex flex-col gap-3 px-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[12px] font-medium tracking-normal text-on-surface-variant/72">
            将执行
          </h3>
          {interaction.plan.steps.length > 2 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((current) => !current)}
              aria-expanded={isExpanded}
              className="rounded-full px-3 text-xs text-on-surface-variant/78 hover:text-on-surface"
            >
              {isExpanded ? '收起步骤' : `查看全部 ${interaction.plan.steps.length} 步`}
            </Button>
          ) : null}
        </div>

        <ol className="grid gap-2.5">
          {previewSteps.map((step, index) => (
            <li
              key={step.id}
              className="rounded-[1rem] border-l-4 border-l-amber-400 border-border/10 bg-amber-50/40 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevation-1)] dark:bg-amber-900/8"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  步骤 {index + 1}
                </span>
                <span className="text-xs font-medium text-on-surface-variant/75">
                  {getToolNameLabel(step.toolName)}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-on-surface">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">{step.preview}</p>
            </li>
          ))}
        </ol>

        {interaction.plan.steps.length > 2 && !isExpanded ? (
          <p className="text-xs leading-5 text-on-surface-variant/70">
            还有 {interaction.plan.steps.length - 2} 个动作会继续处理。
          </p>
        ) : null}
      </div>
    </div>
  )
}
