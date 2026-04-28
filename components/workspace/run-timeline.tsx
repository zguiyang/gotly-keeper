'use client'

import { AlertCircle, CheckCircle2, Circle, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import { workspaceSurfaceClassName } from './workspace-view-primitives'

import type { WorkspaceRunStreamEvent } from '@/shared/workspace/workspace-run-protocol'

type RunTimelineProps = {
  timeline: WorkspaceRunStreamEvent[]
}

const phaseLabels: Record<string, string> = {
  normalize: '标准化',
  understand: '理解',
  plan: '计划',
  review: '审查',
  preview: '预览',
  execute: '执行',
  compose: '组合',
}

const toolLabels: Record<string, string> = {
  create_todo: '创建待办',
  update_todo: '更新待办',
  create_note: '创建笔记',
  update_note: '更新笔记',
  create_bookmark: '创建书签',
  query_assets: '查询资产',
  summarize_assets: '总结资产',
}

function getToolLabel(toolName: string): string {
  return toolLabels[toolName] || toolName.replace(/_/g, ' ')
}

function TimelineItem({
  event,
  isLast,
}: {
  event: WorkspaceRunStreamEvent
  isLast: boolean
}) {
  const getEventIcon = () => {
    switch (event.type) {
      case 'phase_started':
        return <Circle className="size-4 text-primary/60" />
      case 'phase_completed':
        return <CheckCircle2 className="size-4 text-emerald-500" />
      case 'tool_call_started':
        return <Loader2 className="size-4 text-amber-500 animate-spin" />
      case 'tool_call_completed':
        return <CheckCircle2 className="size-4 text-emerald-500" />
      case 'run_completed':
        return <CheckCircle2 className="size-4 text-emerald-500" />
      case 'run_failed':
        return <AlertCircle className="size-4 text-destructive" />
      default:
        return <Circle className="size-4 text-muted-foreground" />
    }
  }

  const getEventLabel = () => {
    switch (event.type) {
      case 'phase_started':
        return `开始: ${phaseLabels[event.phase] || event.phase}`
      case 'phase_completed':
        return `完成: ${phaseLabels[event.phase] || event.phase}`
      case 'tool_call_started':
        return `开始: ${getToolLabel(event.toolName)}`
      case 'tool_call_completed':
        return `完成: ${getToolLabel(event.toolName)}`
      case 'run_completed':
        return '完成: 已生成最终结果'
      case 'run_failed':
        return '失败: 本次执行未完成'
      default:
        return event.type
    }
  }

  const getEventDetail = () => {
    switch (event.type) {
      case 'tool_call_started':
        return event.preview
      case 'tool_call_completed':
        if (typeof event.result === 'object' && event.result !== null && 'ok' in event.result) {
          return event.result.ok ? '成功' : '失败'
        }
        return ''
      case 'run_completed':
        return event.result.answer ?? event.result.summary
      case 'run_failed':
        return event.error.message
      default:
        return ''
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        {getEventIcon()}
        {!isLast && <div className="w-px h-full min-h-[1.5rem] bg-border/50 mt-1" />}
      </div>
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-on-surface">{getEventLabel()}</span>
        </div>
        {getEventDetail() && (
          <p className="text-xs text-on-surface-variant/70 mt-1">{getEventDetail()}</p>
        )}
      </div>
    </div>
  )
}

export function RunTimeline({ timeline }: RunTimelineProps) {
  if (timeline.length === 0) {
    return (
      <Card className={workspaceSurfaceClassName}>
        <CardContent className="p-4">
          <p className="text-sm text-on-surface-variant text-center py-4">
            暂无执行记录
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={workspaceSurfaceClassName}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-xs">
            执行时间线
          </Badge>
          <span className="text-xs text-on-surface-variant">
            {timeline.length} 个事件
          </span>
        </div>

        <div className="space-y-0">
          {timeline.map((event, index) => (
            <TimelineItem
              key={`${event.type}-${index}`}
              event={event}
              isLast={index === timeline.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
