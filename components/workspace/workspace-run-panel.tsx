'use client'

import { Check } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import { CandidatePicker } from './candidate-picker'
import { DraftTaskEditor, type DraftTaskEditorHandle } from './draft-task-editor'
import { PlanPreviewCard } from './plan-preview-card'
import { SlotClarificationForm } from './slot-clarification-form'
import { WorkspaceQueryResultsContent } from './workspace-result-panels'
import { workspaceMetaTextClassName, workspacePillClassName, workspaceRunActionBarClassName, workspaceRunScrollBodyClassName, workspaceRunShellClassName } from './workspace-view-primitives'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type {
  WorkspaceInteraction,
  WorkspaceInteractionResponse,
  WorkspaceRunStreamEvent,
  WorkspaceUnderstandingPreview,
  WorkspacePlanPreview,
} from '@/shared/workspace/workspace-run-protocol'
import type {
  WorkspaceRunApiData,
  WorkspaceRunApiPhase,
} from '@/shared/workspace/workspace-runner.types'

type VisibleWorkspaceRunPhase = {
  phase:
    | WorkspaceRunApiPhase['phase']
    | 'normalize'
    | 'understand'
    | 'plan'
    | 'review'
    | 'preview'
    | 'execute'
    | 'compose'
  status: 'active' | 'done' | 'failed' | 'skipped'
  message?: string
}

type ProcessLine = {
  key: string
  text: string
}

function getPhaseTitle(phase: VisibleWorkspaceRunPhase['phase']) {
  if (phase === 'normalize') {
    return '正在规范化输入'
  }

  if (phase === 'understand') {
    return '正在理解你的输入'
  }

  if (phase === 'plan') {
    return '正在规划执行步骤'
  }

  if (phase === 'review') {
    return '正在检查执行风险'
  }

  if (phase === 'preview') {
    return '正在整理执行预览'
  }

  if (phase === 'parse') {
    return '正在解析你的输入'
  }

  if (phase === 'route') {
    return '正在判断处理方式'
  }

  if (phase === 'execute') {
    return '正在执行处理'
  }

  return '正在生成结果'
}

function getTargetLabel(target: 'notes' | 'todos' | 'bookmarks' | 'mixed') {
  if (target === 'notes') {
    return '笔记'
  }

  if (target === 'todos') {
    return '待办'
  }

  if (target === 'bookmarks') {
    return '书签'
  }

  return '内容'
}

function getMutationTargetLabel(target: 'notes' | 'todos' | 'bookmarks') {
  if (target === 'notes') {
    return '笔记'
  }

  if (target === 'todos') {
    return '待办'
  }

  return '书签'
}

function getToolLabel(toolName: string) {
  if (toolName === 'create_todo') return '创建待办'
  if (toolName === 'update_todo') return '更新待办'
  if (toolName === 'create_note') return '创建笔记'
  if (toolName === 'update_note') return '更新笔记'
  if (toolName === 'create_bookmark') return '创建书签'
  if (toolName === 'query_assets') return '查询内容'
  if (toolName === 'summarize_assets') return '总结内容'
  return toolName
}

function isWorkspacePlanPreview(value: unknown): value is WorkspacePlanPreview {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'summary' in value &&
    typeof value.summary === 'string' &&
    'steps' in value &&
    Array.isArray(value.steps)
  )
}

function derivePlanPreviewFromTimeline(timeline: WorkspaceRunStreamEvent[]) {
  for (const event of [...timeline].reverse()) {
    if (event.type !== 'phase_completed') {
      continue
    }

    if (event.phase === 'preview' && isWorkspacePlanPreview((event.output as { plan?: unknown } | undefined)?.plan)) {
      return (event.output as { plan: WorkspacePlanPreview }).plan
    }

    if (event.phase === 'plan' && isWorkspacePlanPreview(event.output)) {
      return event.output
    }

    if (
      event.phase === 'plan' &&
      event.output &&
      typeof event.output === 'object' &&
      'summary' in event.output &&
      typeof event.output.summary === 'string' &&
      'steps' in event.output &&
      Array.isArray(event.output.steps)
    ) {
      return {
        summary: event.output.summary,
        steps: event.output.steps
          .filter((step): step is { id: string; action: string; title?: string } => (
            Boolean(step && typeof step === 'object' && 'id' in step && 'action' in step)
          ))
          .map((step) => ({
            id: step.id,
            toolName: step.action,
            title: getToolLabel(step.action),
            preview: `${getToolLabel(step.action)}：${step.title ?? ''}`.trimEnd(),
          })),
      }
    }
  }

  return null
}

function getVisiblePhase(
  phases: WorkspaceRunApiPhase[] = [],
  timeline: WorkspaceRunStreamEvent[] = []
): VisibleWorkspaceRunPhase {
  const phaseEvent = [...timeline]
    .reverse()
    .find((event) => event.type === 'phase_started' || event.type === 'phase_completed')

  if (phaseEvent?.type === 'phase_started') {
    return {
      phase: phaseEvent.phase,
      status: 'active',
    }
  }

  if (phaseEvent?.type === 'phase_completed') {
    return {
      phase: phaseEvent.phase,
      status: 'done',
    }
  }

  return (
    phases.findLast((phase) => phase.status === 'active') ??
    phases.findLast((phase) => phase.status === 'failed') ??
    phases.at(-1) ?? {
      phase: 'parse' as const,
      status: 'active' as const,
      message: '正在准备执行',
    }
  )
}

function getPhaseFallbackMessage(visiblePhase: VisibleWorkspaceRunPhase) {
  if (visiblePhase.phase === 'normalize') {
    return '正在整理原始输入，准备后续判断。'
  }

  if (visiblePhase.phase === 'understand') {
    return '正在识别意图、对象和需要执行的任务。'
  }

  if (visiblePhase.phase === 'plan') {
    return '正在把理解结果整理成可执行步骤。'
  }

  if (visiblePhase.phase === 'review') {
    return '正在判断是否可以直接执行，还是需要你确认。'
  }

  if (visiblePhase.phase === 'preview') {
    return '正在整理给你看的执行预览。'
  }

  if (visiblePhase.phase === 'parse') {
    return '正在理解意图、对象和时间线。'
  }

  if (visiblePhase.phase === 'route') {
    return '正在决定保存、查询还是整理已有内容。'
  }

  if (visiblePhase.phase === 'execute') {
    return '正在处理相关内容。'
  }

  return '正在把结果整理成可读的回复。'
}

function formatElapsedMs(elapsedMs: number | null | undefined) {
  if (!elapsedMs || elapsedMs < 1000) {
    return null
  }

  const totalSeconds = Math.round(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `耗时 ${seconds}s`
  }

  return `耗时 ${minutes}m${String(seconds).padStart(2, '0')}s`
}

function getPhaseLine(visiblePhase: VisibleWorkspaceRunPhase) {
  const phaseTitle = getPhaseTitle(visiblePhase.phase)
  const message = visiblePhase.message ?? getPhaseFallbackMessage(visiblePhase)
  return message ? `${phaseTitle} · ${message}` : phaseTitle
}

function pushUniqueLine(lines: ProcessLine[], line: ProcessLine) {
  if (lines.at(-1)?.text === line.text) {
    return
  }

  lines.push(line)
}

function collectProcessLines(
  timeline: WorkspaceRunStreamEvent[],
  visiblePhase: VisibleWorkspaceRunPhase
) {
  const lines: ProcessLine[] = []

  for (const event of timeline) {
    if (event.type === 'phase_started') {
      pushUniqueLine(lines, {
        key: `phase-${event.phase}-${lines.length}`,
        text: getPhaseLine({ phase: event.phase, status: 'active' }),
      })
    }

    if (event.type === 'tool_call_started') {
      pushUniqueLine(lines, {
        key: `tool-${event.toolName}-${lines.length}`,
        text: event.preview,
      })
    }
  }

  if (lines.length === 0) {
    lines.push({
      key: `fallback-${visiblePhase.phase}`,
      text: getPhaseLine(visiblePhase),
    })
  }

  return lines.slice(-2)
}

function getToolProgress(timeline: WorkspaceRunStreamEvent[]) {
  let startedCount = 0
  let completedCount = 0

  for (const event of timeline) {
    if (event.type === 'tool_call_started') {
      startedCount += 1
    }

    if (event.type === 'tool_call_completed') {
      completedCount += 1
    }
  }

  const activeIndex = startedCount > completedCount ? completedCount : null
  const nextIndex = Math.min(completedCount, Math.max(0, startedCount))

  return {
    activeIndex,
    nextIndex,
  }
}

function getCompactPlanSteps(
  planPreview: WorkspacePlanPreview,
  activeIndex: number | null,
  nextIndex: number
) {
  if (planPreview.steps.length <= 2) {
    return planPreview.steps
  }

  const focusIndex = activeIndex ?? nextIndex

  if (focusIndex <= 0) {
    return planPreview.steps.slice(0, 2)
  }

  if (focusIndex >= planPreview.steps.length - 1) {
    return planPreview.steps.slice(-2)
  }

  return planPreview.steps.slice(focusIndex, focusIndex + 2)
}

function StreamingSinglePanel({
  lines,
}: {
  lines: ProcessLine[]
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="flex min-h-[7rem] items-center justify-start">
      <div className="flex w-full items-start gap-3 px-1 pt-2 sm:px-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary/45 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>

        <div className="min-w-0 flex-1 space-y-1" role="status" aria-live="polite" aria-atomic="true">
          <AnimatePresence initial={false} mode="popLayout">
            {lines.map((line, index) => (
              <motion.p
                key={line.key}
                layout
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={prefersReducedMotion
                  ? { duration: 0.18, ease: 'linear' }
                  : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className={index === lines.length - 1
                  ? 'truncate text-sm leading-7 text-on-surface'
                  : 'truncate text-sm leading-6 text-on-surface-variant/58'}
                title={line.text}
              >
                {line.text}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function getMarker(isActive: boolean, isCompleted: boolean) {
  if (isActive) return { symbol: '○', className: 'text-primary' }
  if (isCompleted) return { symbol: '✓', className: 'text-emerald-500' }
  return { symbol: '·', className: 'text-on-surface-variant/40' }
}

function StreamingMultiPanel({
  planPreview,
  timeline,
  visiblePhase,
}: {
  planPreview: WorkspacePlanPreview
  timeline: WorkspaceRunStreamEvent[]
  visiblePhase: VisibleWorkspaceRunPhase
}) {
  const { activeIndex, nextIndex } = getToolProgress(timeline)
  const visibleSteps = getCompactPlanSteps(planPreview, activeIndex, nextIndex)
  const areToolsFinished = nextIndex >= planPreview.steps.length
  const isComposePhase = visiblePhase.phase === 'compose'

  return (
    <div className="space-y-3 px-1 sm:px-2">
      <p className="text-sm font-medium text-on-surface">{planPreview.summary}</p>

      <ol className="space-y-1.5">
        {visibleSteps.map((step) => {
          const absoluteIndex = planPreview.steps.findIndex((candidate) => candidate.id === step.id)
          const isActive = activeIndex !== null ? absoluteIndex === activeIndex : false
          const isCompleted = isComposePhase || areToolsFinished || absoluteIndex < nextIndex
          const marker = getMarker(isActive, isCompleted)

          return (
            <li key={step.id} className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 text-sm leading-6 ${marker.className}`}>
                {marker.symbol}
              </span>
              <p className={`min-w-0 text-sm leading-6 ${isActive ? 'font-medium text-on-surface' : isCompleted ? 'text-on-surface-variant/70' : 'text-on-surface-variant/50'}`}>
                {step.preview}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function StreamingPanel({
  planPreview,
  timeline,
  visiblePhase,
}: {
  planPreview: WorkspacePlanPreview | null
  timeline: WorkspaceRunStreamEvent[]
  visiblePhase: VisibleWorkspaceRunPhase
}) {
  if (planPreview && planPreview.steps.length > 1) {
    return <StreamingMultiPanel planPreview={planPreview} timeline={timeline} visiblePhase={visiblePhase} />
  }

  return <StreamingSinglePanel lines={collectProcessLines(timeline, visiblePhase)} />
}

function FinalResult({
  assistantText,
  result,
  errorMessage,
  status,
  elapsedMs,
}: {
  assistantText: string | null
  result: WorkspaceRunApiData | WorkspaceBatchResult | null
  errorMessage: string | null
  status: 'streaming' | 'success' | 'error'
  elapsedMs?: number | null
}) {
  const elapsedText = formatElapsedMs(elapsedMs)

  if (status === 'streaming') {
    return null
  }

  if (status === 'error' || result?.kind === 'error') {
    const detailMessage = result?.kind === 'error'
      ? result.message
      : errorMessage ?? '处理失败'

    return (
      <div className="rounded-[1rem] border border-destructive/15 bg-destructive/5 px-4 py-3">
        <p className="text-sm font-semibold text-destructive">这次没有完成处理</p>
        <p className="mt-1.5 text-sm text-destructive/80">
          {detailMessage}
        </p>
        <p className="mt-3 text-xs text-on-surface-variant/70">可以换成更明确的说法，让 AI 助手更容易理解你的需求。</p>
        {elapsedText ? (
          <p className="mt-2 text-xs text-on-surface-variant/70">{elapsedText}</p>
        ) : null}
      </div>
    )
  }

  if (result?.kind === 'query') {
    if (result.total === 0) {
    return (
      <div className="space-y-2">
          <p className="text-sm font-semibold text-on-surface">没有找到相关内容</p>
          {assistantText ? (
            <p className="text-sm leading-6 text-on-surface-variant/80">
              {assistantText}
            </p>
          ) : null}
          {elapsedText ? (
            <p className="text-xs text-on-surface-variant/70">{elapsedText}</p>
          ) : null}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={workspacePillClassName}>
            找到 {result.total} 条{getTargetLabel(result.target)}
          </span>
          {assistantText ? (
            <span className={workspaceMetaTextClassName}>{assistantText}</span>
          ) : null}
        </div>
        <WorkspaceQueryResultsContent results={result.items} />
        {elapsedText ? (
          <p className="text-xs text-on-surface-variant/70">{elapsedText}</p>
        ) : null}
      </div>
    )
  }

  if (result?.kind === 'mutation') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={workspacePillClassName}>
            {result.action === 'create' ? '已创建' : '已更新'}
            {getMutationTargetLabel(result.target)}
          </span>
          {assistantText ? (
            <span className={workspaceMetaTextClassName}>{assistantText}</span>
          ) : null}
        </div>
        {result.item ? (
          <div className="rounded-[1rem] border border-border/10 bg-muted/45 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-on-surface">
              {result.item.title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant/70">
              {result.item.excerpt}
            </p>
          </div>
        ) : null}
        {elapsedText ? (
          <p className="text-xs text-on-surface-variant/70">{elapsedText}</p>
        ) : null}
      </div>
    )
  }

  if (result?.kind === 'batch') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={workspacePillClassName}>{result.summary}</span>
          {assistantText ? (
            <span className={workspaceMetaTextClassName}>{assistantText}</span>
          ) : null}
        </div>
        <div className="space-y-2">
          {result.stepResults.map((step) => {
            const normalized = getBatchStepItem(step)

            if (normalized?.kind === 'mutation') {
              return (
                <div
                  key={step.stepId}
                  className="rounded-[1rem] border border-border/10 bg-muted/45 px-3 py-2.5"
                >
                  <p className="text-xs font-medium text-on-surface-variant/70">
                    {normalized.action === 'create' ? '已创建' : '已更新'}
                    {getMutationTargetLabel(normalized.target)}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-on-surface">
                    {normalized.item?.title ?? getToolLabel(step.toolName)}
                  </p>
                  {normalized.item?.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant/70">
                      {normalized.item.excerpt}
                    </p>
                  ) : null}
                </div>
              )
            }

            if (normalized?.kind === 'query') {
              return (
                <div
                  key={step.stepId}
                  className="rounded-[1rem] border border-border/10 bg-muted/45 px-3 py-2.5"
                >
                  <p className="text-xs font-medium text-on-surface-variant/70">
                    {getToolLabel(step.toolName)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-on-surface">
                    找到 {normalized.total} 条{getTargetLabel(normalized.target)}
                  </p>
                </div>
              )
            }

            if (normalized?.kind === 'error') {
              return (
                <div
                  key={step.stepId}
                  className="rounded-[1rem] border border-destructive/15 bg-destructive/5 px-3 py-2.5"
                >
                  <p className="text-xs font-medium text-destructive">
                    {getToolLabel(step.toolName)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-destructive">
                    {normalized.message}
                  </p>
                </div>
              )
            }

            return (
              <div
                key={step.stepId}
                className="rounded-[1rem] border border-border/10 bg-muted/45 px-3 py-2.5"
              >
                <p className="text-sm font-medium text-on-surface">
                  {normalized?.message ?? getToolLabel(step.toolName)}
                </p>
              </div>
            )
          })}
        </div>
        {elapsedText ? (
          <p className="text-xs text-on-surface-variant/70">{elapsedText}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-[1rem] border border-border/10 bg-muted/35 px-4 py-3">
      <p className="break-words text-sm leading-6 text-on-surface">
        {assistantText ?? '处理完成。'}
      </p>
      {elapsedText ? (
        <p className="text-xs text-on-surface-variant/70">{elapsedText}</p>
      ) : null}
    </div>
  )
}

type WorkspaceToolSuccessData = {
  ok: true
  target: 'notes' | 'todos' | 'bookmarks' | 'mixed'
  items?: AssetListItem[]
  total?: number
  action?: 'create' | 'update'
  item?: AssetListItem | null
}

type WorkspaceBatchResult = {
  kind: 'batch'
  summary: string
  stepResults: Array<{
    stepId: string
    toolName: string
    result: unknown
  }>
}

function isWorkspaceToolSuccessData(value: WorkspaceRunApiData | WorkspaceToolSuccessData | WorkspaceBatchResult | null): value is WorkspaceToolSuccessData {
  return Boolean(value && typeof value === 'object' && 'ok' in value && value.ok === true)
}

function isWorkspaceBatchResult(value: WorkspaceRunApiData | WorkspaceToolSuccessData | WorkspaceBatchResult | null): value is WorkspaceBatchResult {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'kind' in value &&
    value.kind === 'batch' &&
    'stepResults' in value &&
    Array.isArray(value.stepResults)
  )
}

function toLegacyResultData(
  result: WorkspaceRunApiData | WorkspaceToolSuccessData | WorkspaceBatchResult | null
): WorkspaceRunApiData | null {
  if (isWorkspaceBatchResult(result)) {
    return result
  }

  if (!isWorkspaceToolSuccessData(result)) {
    return result
  }

  if (result.action && result.target !== 'mixed') {
    return {
      kind: 'mutation',
      action: result.action,
      target: result.target,
      item: result.item ?? null,
    }
  }

  if (Array.isArray(result.items) && typeof result.total === 'number') {
    return {
      kind: 'query',
      target: result.target,
      items: result.items,
      total: result.total,
    }
  }

  return null
}

function getBatchStepItem(step: WorkspaceBatchResult['stepResults'][number]) {
  if (!step.result || typeof step.result !== 'object') {
    return null
  }

  const result = step.result as {
    ok?: boolean
    action?: 'create' | 'update'
    target?: 'notes' | 'todos' | 'bookmarks' | 'mixed'
    item?: AssetListItem | null
    total?: number
    items?: AssetListItem[]
    message?: string
  }

  if (result.ok && result.action && result.target && result.target !== 'mixed') {
    return {
      kind: 'mutation' as const,
      action: result.action,
      target: result.target,
      item: result.item ?? null,
    }
  }

  if (result.ok && Array.isArray(result.items) && typeof result.total === 'number' && result.target) {
    return {
      kind: 'query' as const,
      target: result.target,
      total: result.total,
      items: result.items,
    }
  }

  if (result.ok === false) {
    return {
      kind: 'error' as const,
      message: result.message ?? '处理失败',
    }
  }

  return {
    kind: 'fallback' as const,
    message: getToolLabel(step.toolName),
  }
}

function InteractionPanel({
  interaction,
  candidateSelection,
  onCandidateSelect,
  slotFormId,
  onResume,
  draftEditorRef,
}: {
  interaction: WorkspaceInteraction
  candidateSelection: string | null
  onCandidateSelect: (candidateId: string) => void
  slotFormId: string
  onResume: (response: WorkspaceInteractionResponse) => void
  draftEditorRef?: React.Ref<DraftTaskEditorHandle>
}) {
  switch (interaction.type) {
    case 'select_candidate':
      return (
        <CandidatePicker
          key={interaction.id}
          interaction={interaction}
          selectedId={candidateSelection}
          onSelect={onCandidateSelect}
        />
      )
    case 'clarify_slots':
      return (
        <SlotClarificationForm
          key={interaction.id}
          interaction={interaction}
          formId={slotFormId}
          onSubmit={onResume}
        />
      )
    case 'edit_draft_tasks':
      return <DraftTaskEditor key={interaction.id} ref={draftEditorRef} interaction={interaction} />
    case 'confirm_plan':
      return <PlanPreviewCard key={interaction.id} interaction={interaction} />
    default:
      return null
  }
}

function InteractionActionIntro({
  interaction,
}: {
  interaction: WorkspaceInteraction
}) {
  if (interaction.type === 'edit_draft_tasks') {
    return '确认标题和附加信息后，保存这些任务并继续执行。'
  }

  if (interaction.type === 'confirm_plan') {
    return '执行前最后确认一遍步骤；确认后会按顺序处理这些动作。'
  }

  if (interaction.type === 'select_candidate') {
    return '选择最合适的候选内容，或跳过这次匹配。'
  }

  return '补充缺失信息后即可继续。'
}

export function WorkspaceRunPanel({
  status,
  assistantText,
  phases = [],
  result = null,
  errorMessage = null,
  interaction,
  timeline = [],
  understandingPreview = null,
  planPreview = null,
  elapsedMs = null,
  onResume,
}: {
  status: 'idle' | 'streaming' | 'awaiting_user' | 'success' | 'error'
  assistantText: string | null
  phases?: WorkspaceRunApiPhase[]
  result?: WorkspaceRunApiData | WorkspaceToolSuccessData | WorkspaceBatchResult | null
  errorMessage?: string | null
  runId?: string
  interaction?: WorkspaceInteraction
  timeline?: WorkspaceRunStreamEvent[]
  understandingPreview?: WorkspaceUnderstandingPreview | null
  planPreview?: WorkspacePlanPreview | null
  elapsedMs?: number | null
  correctionNotes?: string[]
  onResume?: (response: WorkspaceInteractionResponse) => void
}) {
  const visiblePhase = getVisiblePhase(phases, timeline)
  const resolvedPlanPreview = planPreview ?? derivePlanPreviewFromTimeline(timeline)
  const resolvedResult = toLegacyResultData(result)
  const draftEditorRef = useRef<DraftTaskEditorHandle>(null)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const slotFormId = useId()
  const showDisclosure = status !== 'streaming' && (understandingPreview || planPreview)

  useEffect(() => {
    setSelectedCandidateId(null)
  }, [interaction?.id])

  const headerTitle = status === 'awaiting_user'
    ? null
    : status === 'streaming'
      ? visiblePhase.message ?? getPhaseFallbackMessage(visiblePhase)
      : null

  function renderActions(interaction: WorkspaceInteraction) {
    if (!onResume) return null

    if (interaction.type === 'edit_draft_tasks') {
      return (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              const tasks = draftEditorRef.current?.getTasks()
              onResume({
                type: 'edit_draft_tasks',
                action: 'save',
                tasks: tasks ?? [],
              })
            }}
            className="rounded-full px-4"
          >
            <Check data-icon="inline-start" />
            保存任务并继续
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResume({ type: 'edit_draft_tasks', action: 'cancel' })}
            className="rounded-full px-4"
          >
            取消
          </Button>
        </>
      )
    }

    if (interaction.type === 'select_candidate') {
      return (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              if (selectedCandidateId) {
                onResume({ type: 'select_candidate', action: 'select', candidateId: selectedCandidateId })
              }
            }}
            disabled={!selectedCandidateId}
            className="rounded-full px-4"
          >
            使用这条候选
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResume({ type: 'select_candidate', action: 'skip' })}
            className="rounded-full px-4"
          >
            跳过
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onResume({ type: 'select_candidate', action: 'cancel' })}
            className="rounded-full px-4"
          >
            取消
          </Button>
        </>
      )
    }

    if (interaction.type === 'clarify_slots') {
      return (
        <>
          <Button
            variant="default"
            size="sm"
            type="submit"
            form={slotFormId}
            className="rounded-full px-4"
          >
            提交信息
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResume({ type: 'clarify_slots', action: 'cancel' })}
            className="rounded-full px-4"
          >
            取消
          </Button>
        </>
      )
    }

    if (interaction.type === 'confirm_plan') {
      return (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={() => onResume({ type: 'confirm_plan', action: 'confirm' })}
            className="rounded-full px-4"
          >
            <Check data-icon="inline-start" />
            确认并执行
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResume({ type: 'confirm_plan', action: 'cancel' })}
            className="rounded-full px-4"
          >
            返回修改
          </Button>
        </>
      )
    }

    return null
  }

  return (
    <motion.section
      data-testid="workspace-run-panel"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={workspaceRunShellClassName}
    >
      <header
        data-testid="workspace-run-panel-header"
        className="mb-3 flex items-center gap-2"
      >
        {headerTitle ? (
          <span className="text-xs font-medium text-on-surface-variant/70">
            {headerTitle}
          </span>
        ) : null}
      </header>

      <div
        data-testid="workspace-run-panel-content"
        className={workspaceRunScrollBodyClassName}
      >
        <AnimatePresence mode="wait" initial={false}>
          {status === 'awaiting_user' && interaction && onResume ? (
            <motion.div
              key="interaction"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <InteractionPanel
                interaction={interaction}
                candidateSelection={selectedCandidateId}
                onCandidateSelect={setSelectedCandidateId}
                slotFormId={slotFormId}
                onResume={onResume}
                draftEditorRef={draftEditorRef}
              />
            </motion.div>
          ) : status === 'streaming' ? (
            <motion.div
              key="current-step"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <StreamingPanel
                planPreview={resolvedPlanPreview}
                timeline={timeline}
                visiblePhase={visiblePhase}
              />
            </motion.div>
          ) : (
            <motion.div
              key="final-result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <FinalResult
                assistantText={assistantText}
                result={resolvedResult}
                errorMessage={errorMessage}
                status={(status === 'idle' ? 'success' : status) as 'success' | 'error'}
                elapsedMs={elapsedMs}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showDisclosure ? (
        <div className="mt-3 border-t border-border/10 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDetailsExpanded((prev) => !prev)}
            aria-expanded={detailsExpanded}
            className="rounded-full px-3 text-xs text-on-surface-variant/70"
          >
            {detailsExpanded ? '收起详情' : '展开详情'}
          </Button>

          {detailsExpanded ? (
            <div className="mt-3 space-y-3">
              {understandingPreview ? (
                <div className="space-y-2 rounded-[0.75rem] bg-muted/30 px-3 py-2.5">
                  <p className="text-xs text-on-surface-variant/50">原始输入</p>
                  <p className="text-sm text-on-surface">{understandingPreview.rawInput}</p>

                  {understandingPreview.normalizedInput !== understandingPreview.rawInput ? (
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant/50">标准化后</p>
                      <p className="text-sm text-on-surface">{understandingPreview.normalizedInput}</p>
                    </div>
                  ) : null}

                  {understandingPreview.corrections.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant/50">修正</p>
                      <p className="text-sm text-on-surface">{understandingPreview.corrections.join('、')}</p>
                    </div>
                  ) : null}

                  {understandingPreview.draftTasks.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant/50">识别任务 ({understandingPreview.draftTasks.length})</p>
                      <ol className="space-y-1">
                        {understandingPreview.draftTasks.map((task) => (
                          <li key={task.id} className="text-sm text-on-surface">
                            {task.title}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {planPreview ? (
                <div className="space-y-2 rounded-[0.75rem] bg-muted/30 px-3 py-2.5">
                  <p className="text-xs text-on-surface-variant/50">执行步骤 ({planPreview.steps.length})</p>
                  <ol className="space-y-1">
                    {planPreview.steps.map((step) => (
                      <li key={step.id} className="text-sm text-on-surface">
                        {step.preview}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {status === 'awaiting_user' && interaction ? (
        <footer
          data-testid="workspace-run-panel-actions"
          className={workspaceRunActionBarClassName}
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-on-surface-variant/70">
              {InteractionActionIntro({ interaction })}
            </p>
          </div>
          <Separator orientation="vertical" className="hidden h-6 bg-border/10 sm:block" />
          {renderActions(interaction)}
        </footer>
      ) : null}
    </motion.section>
  )
}
