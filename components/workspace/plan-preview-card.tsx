'use client'

import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <Card className={workspaceInteractionCardClassName}>
      <CardHeader className="gap-2 px-5 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] font-medium tracking-normal">
            待确认执行
          </Badge>
          <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px] font-medium tracking-normal">
            {interaction.plan.steps.length} 个动作
          </Badge>
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base text-on-surface">{interaction.plan.summary}</CardTitle>
          <CardDescription className={workspaceInteractionBodyTextClassName}>
            {interaction.message}
          </CardDescription>
        </div>
      </CardHeader>

      <Separator className="bg-border/10" />

      <CardContent className="flex flex-col gap-2 px-5 pb-4 pt-3">
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

        <ol className="flex flex-col gap-2">
          {previewSteps.map((step, index) => (
            <li
              key={step.id}
              className="rounded-[1rem] border border-border/10 bg-muted/30 px-4 py-3 transition-[transform,border-color,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-border/20 hover:bg-muted/40 hover:shadow-[var(--shadow-elevation-1)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-normal">
                  步骤 {index + 1}
                </Badge>
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
      </CardContent>
    </Card>
  )
}
