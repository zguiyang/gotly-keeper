'use client'

import { AlertCircle, CheckCircle2, Circle, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslations } from '@/hooks/use-locale'

import { workspaceSurfaceClassName } from './workspace-view-primitives'

import type { WorkspaceRunStreamEvent } from '@/shared/workspace/workspace-run-protocol'

type RunTimelineProps = {
  timeline: WorkspaceRunStreamEvent[]
}

const phaseKeyMap: Record<string, string> = {
  normalize: 'normalize',
  semantic_split: 'split',
  understand: 'understand',
  plan: 'plan',
  review: 'review',
  preview: 'preview',
  execute: 'execute',
  compose: 'compose',
}

const toolKeyMap: Record<string, string> = {
  create_todo: 'createTodo',
  update_todo: 'updateTodo',
  create_note: 'createNote',
  update_note: 'updateNote',
  create_bookmark: 'createBookmark',
  query_assets: 'queryAsset',
  summarize_assets: 'summarizeAsset',
}

function getToolLabel(toolName: string): string {
  const key = toolKeyMap[toolName]
  return key || toolName.replace(/_/g, ' ')
}

function TimelineItem({
  event,
  isLast,
  t,
}: {
  event: WorkspaceRunStreamEvent
  isLast: boolean
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const getEventIcon = () => {
    switch (event.type) {
      case 'phase_started':
        return <Circle className="size-4 text-primary/60" />
      case 'phase_completed':
        return <CheckCircle2 className="size-4 text-status-success" />
      case 'tool_call_started':
        return <Loader2 className="size-4 text-amber-500 animate-spin" />
      case 'tool_call_completed':
        return <CheckCircle2 className="size-4 text-status-success" />
      case 'run_completed':
        return <CheckCircle2 className="size-4 text-status-success" />
      case 'run_failed':
        return <AlertCircle className="size-4 text-destructive" />
      default:
        return <Circle className="size-4 text-muted-foreground" />
    }
  }

  const getEventLabel = () => {
    switch (event.type) {
      case 'phase_started':
        return t('start') + ': ' + (phaseKeyMap[event.phase] ? t(phaseKeyMap[event.phase]) : event.phase)
      case 'phase_completed':
        return t('complete') + ': ' + (phaseKeyMap[event.phase] ? t(phaseKeyMap[event.phase]) : event.phase)
      case 'tool_call_started':
        return t('start') + ': ' + (toolKeyMap[event.toolName] ? t(toolKeyMap[event.toolName]) : getToolLabel(event.toolName))
      case 'tool_call_completed':
        return t('complete') + ': ' + (toolKeyMap[event.toolName] ? t(toolKeyMap[event.toolName]) : getToolLabel(event.toolName))
      case 'run_completed':
        return t('completed')
      case 'run_failed':
        return t('failed')
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
          return event.result.ok ? t('success') : t('failed')
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
  const t = useTranslations('workspace.runTimeline')

  if (timeline.length === 0) {
    return (
      <Card className={workspaceSurfaceClassName}>
        <CardContent className="p-4">
          <p className="text-sm text-on-surface-variant text-center py-4">
            {t('noRecords')}
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
            {t('executionTimeline')}
          </Badge>
          <span className="text-xs text-on-surface-variant">
            {t('events', { count: timeline.length })}
          </span>
        </div>

        <div className="space-y-0">
          {timeline.map((event, index) => (
            <TimelineItem
              key={`${event.type}-${index}`}
              event={event}
              isLast={index === timeline.length - 1}
              t={t}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
