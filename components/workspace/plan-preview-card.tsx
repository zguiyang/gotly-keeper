'use client'

import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { workspacePillClassName, workspaceSurfaceClassName } from './workspace-view-primitives'

import type { ConfirmPlanInteraction, WorkspaceInteractionResponse } from '@/shared/workspace/workspace-run-protocol'

type PlanPreviewCardProps = {
  interaction: ConfirmPlanInteraction
  onSubmit: (response: WorkspaceInteractionResponse) => void
}

export function PlanPreviewCard({ interaction, onSubmit }: PlanPreviewCardProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleConfirm = () => {
    onSubmit({
      type: 'confirm_plan',
      action: 'confirm',
    })
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleCancel = () => {
    onSubmit({
      type: 'confirm_plan',
      action: 'cancel',
    })
  }

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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-on-surface-variant">{interaction.message}</p>
      </div>

      <Card className={workspaceSurfaceClassName}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">计划预览</CardTitle>
            <span className={workspacePillClassName}>
              {interaction.plan.summary}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {interaction.plan.steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/40"
            >
              <div className="flex-shrink-0 size-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {getToolNameLabel(step.toolName)}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-on-surface">{step.title}</p>
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  {step.preview}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isEditing && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm text-on-surface-variant">
              编辑功能即将推出。当前版本请先确认或取消。
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleCancelEdit}>
              返回
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button variant="default" size="sm" onClick={handleConfirm}>
          确认
        </Button>
        <Button variant="outline" size="sm" onClick={handleEdit}>
          编辑
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          取消
        </Button>
      </div>
    </div>
  )
}
