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
import {
  workspaceMetaTextClassName,
  workspacePillClassName,
  workspacePrimaryActionButtonClassName,
  workspaceRunActionBarClassName,
  workspaceRunScrollBodyClassName,
  workspaceRunShellClassName,
  workspaceSecondaryActionButtonClassName,
} from './workspace-view-primitives'

import type { AssetListItem } from '@/shared/assets/assets.types'
import {
  workspacePlanPreviewSchema,
  workspacePreviewSchema,
  workspaceUnderstandingPreviewSchema,
} from '@/shared/workspace/workspace-run-protocol'
import type {
  WorkspaceInteraction,
  WorkspaceInteractionResponse,
  WorkspacePlanPreview,
  WorkspaceRunPhase,
  WorkspaceRunResult,
  WorkspaceRunStepResult,
  WorkspaceRunStreamEvent,
  WorkspaceRunToolResult,
  WorkspaceUnderstandingPreview,
} from '@/shared/workspace/workspace-run-protocol'

type VisibleWorkspaceRunPhase = {
  phase: WorkspaceRunPhase
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

function getVisiblePhase(
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

  return {
    phase: 'normalize',
    status: 'active',
    message: '正在准备执行',
  }
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
  if (isCompleted) return { symbol: '✓', className: 'text-status-success' }
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

type WorkspaceDisplayResult =
  | {
      kind: 'query'
      target: 'notes' | 'todos' | 'bookmarks' | 'mixed'
      items: AssetListItem[]
      total: number
    }
  | {
      kind: 'mutation'
      action: 'create' | 'update'
      target: 'notes' | 'todos' | 'bookmarks'
      item: AssetListItem | null
    }
  | {
      kind: 'batch'
      summary: string
      stepResults: WorkspaceRunStepResult[]
    }
  | {
      kind: 'error'
      message: string
    }

type WorkspaceStepDisplayResult = Exclude<WorkspaceDisplayResult, { kind: 'batch' }>

function normalizeWorkspaceResultData(
  data: WorkspaceRunToolResult | null | undefined
): WorkspaceStepDisplayResult | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  if (
    data.ok &&
    Array.isArray(data.items) &&
    typeof data.total === 'number' &&
    data.target
  ) {
    return {
      kind: 'query',
      target: data.target,
      items: data.items,
      total: data.total,
    }
  }

  if (data.ok && data.action && data.target && data.target !== 'mixed') {
    return {
      kind: 'mutation',
      action: data.action,
      target: data.target,
      item: data.item ?? null,
    }
  }

  if (!data.ok) {
    return {
      kind: 'error',
      message: data.message ?? '处理失败',
    }
  }

  return null
}

function normalizeFinalResult(result: WorkspaceRunResult | null): WorkspaceDisplayResult | null {
  if (!result) {
    return null
  }

  if (Array.isArray(result.stepResults) && result.stepResults.length > 1) {
    return {
      kind: 'batch',
      summary: result.summary,
      stepResults: result.stepResults,
    }
  }

  const dataResult = normalizeWorkspaceResultData(result.data)
  if (dataResult) {
    return dataResult
  }

  if (Array.isArray(result.stepResults) && result.stepResults.length === 1) {
    return normalizeWorkspaceResultData(result.stepResults[0]?.result)
  }

  return null
}

function FinalResult({
  assistantText,
  result,
  errorMessage,
  status,
  elapsedMs,
}: {
  assistantText: string | null
  result: WorkspaceDisplayResult | null
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

function getBatchStepItem(step: WorkspaceRunStepResult) {
  const normalized = normalizeWorkspaceResultData(step.result)
  if (normalized) {
    return normalized
  }

  return {
    kind: 'fallback' as const,
    message: getToolLabel(step.toolName),
  }
}

function derivePreviewStateFromTimeline(timeline: WorkspaceRunStreamEvent[]) {
  let understandingPreview: WorkspaceUnderstandingPreview | null = null
  let planPreview: WorkspacePlanPreview | null = null

  for (const event of timeline) {
    if (event.type !== 'phase_completed') {
      continue
    }

    if (event.phase === 'preview') {
      const parsed = workspacePreviewSchema.safeParse(event.output)
      if (parsed.success) {
        understandingPreview = parsed.data.understanding ?? understandingPreview
        planPreview = parsed.data.plan ?? planPreview
      }
      continue
    }

    if (event.phase === 'understand' && understandingPreview === null) {
      const parsed = workspaceUnderstandingPreviewSchema.safeParse(event.output)
      if (parsed.success) {
        understandingPreview = parsed.data
      }
      continue
    }

    if (event.phase === 'plan' && planPreview === null) {
      const parsed = workspacePlanPreviewSchema.safeParse(event.output)
      if (parsed.success) {
        planPreview = parsed.data
      }
    }
  }

  return {
    understandingPreview,
    planPreview,
  }
}

function DuplicateConfirmationCard({
  interaction,
}: {
  interaction: Extract<WorkspaceInteraction, { type: 'confirm_duplicate' }>
}) {
  const targetLabelMap = {
    todo: '待办',
    note: '笔记',
    bookmark: '书签',
  } as const

  return (
    <div className="space-y-3 rounded-[1rem] border border-border/10 bg-muted/35 px-4 py-3">
      <div className="space-y-1">
        <p className="text-xs text-on-surface-variant/60">疑似重复{targetLabelMap[interaction.target]}</p>
        <p className="text-sm font-medium text-on-surface">{interaction.current.title}</p>
        <p className="text-sm text-on-surface-variant/80">{interaction.current.preview}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-on-surface-variant/60">已存在内容</p>
        <ol className="space-y-2">
          {interaction.duplicates.map((candidate) => (
            <li
              key={candidate.id}
              className="rounded-[0.85rem] border border-border/10 bg-surface-container-lowest/80 px-3 py-2"
            >
              <p className="text-sm text-on-surface">{candidate.label}</p>
              {candidate.reason ? (
                <p className="mt-1 text-xs text-on-surface-variant/70">{candidate.reason}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
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
    case 'confirm_duplicate':
      return <DuplicateConfirmationCard key={interaction.id} interaction={interaction} />
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

  if (interaction.type === 'confirm_duplicate') {
    return '这条内容看起来和已有记录重复，你可以继续创建，也可以只跳过这一项。'
  }

  return '补充缺失信息后即可继续。'
}

export function WorkspaceRunPanel({
  status,
  assistantText,
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
  result?: WorkspaceRunResult | null
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
  const visiblePhase = getVisiblePhase(timeline)
  const resolvedResult = normalizeFinalResult(result)
  const derivedPreviewState = derivePreviewStateFromTimeline(timeline)
  const resolvedUnderstandingPreview = understandingPreview ?? derivedPreviewState.understandingPreview
  const resolvedPlanPreview = planPreview ?? derivedPreviewState.planPreview
  const draftEditorRef = useRef<DraftTaskEditorHandle>(null)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const slotFormId = useId()
  const showDisclosure =
    status !== 'streaming' &&
    (resolvedUnderstandingPreview || resolvedPlanPreview)

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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            onClick={() => {
              const tasks = draftEditorRef.current?.getTasks()
              onResume({
                type: 'edit_draft_tasks',
                action: 'save',
                tasks: tasks ?? [],
              })
            }}
            className={workspacePrimaryActionButtonClassName}
          >
            <Check data-icon="inline-start" />
            保存任务并继续
          </Button>
          <Button
            variant="outline"
            onClick={() => onResume({ type: 'edit_draft_tasks', action: 'cancel' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            取消
          </Button>
        </div>
      )
    }

    if (interaction.type === 'select_candidate') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            onClick={() => {
              if (selectedCandidateId) {
                onResume({ type: 'select_candidate', action: 'select', candidateId: selectedCandidateId })
              }
            }}
            disabled={!selectedCandidateId}
            className={workspacePrimaryActionButtonClassName}
          >
            使用这条候选
          </Button>
          <Button
            variant="outline"
            onClick={() => onResume({ type: 'select_candidate', action: 'skip' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            跳过
          </Button>
          <Button
            variant="ghost"
            onClick={() => onResume({ type: 'select_candidate', action: 'cancel' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            取消
          </Button>
        </div>
      )
    }

    if (interaction.type === 'clarify_slots') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            type="submit"
            form={slotFormId}
            className={workspacePrimaryActionButtonClassName}
          >
            提交信息
          </Button>
          <Button
            variant="outline"
            onClick={() => onResume({ type: 'clarify_slots', action: 'cancel' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            取消
          </Button>
        </div>
      )
    }

    if (interaction.type === 'confirm_plan') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            onClick={() => onResume({ type: 'confirm_plan', action: 'confirm' })}
            className={workspacePrimaryActionButtonClassName}
          >
            <Check data-icon="inline-start" />
            确认并执行
          </Button>
        </div>
      )
    }

    if (interaction.type === 'confirm_duplicate') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            onClick={() => onResume({ type: 'confirm_duplicate', action: 'create' })}
            className={workspacePrimaryActionButtonClassName}
          >
            <Check data-icon="inline-start" />
            仍然创建
          </Button>
          <Button
            variant="outline"
            onClick={() => onResume({ type: 'confirm_duplicate', action: 'skip' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            跳过这项
          </Button>
          <Button
            variant="ghost"
            onClick={() => onResume({ type: 'confirm_duplicate', action: 'cancel' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            取消
          </Button>
        </div>
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
              {resolvedUnderstandingPreview ? (
                <div className="space-y-2 rounded-[0.75rem] bg-muted/30 px-3 py-2.5">
                  <p className="text-xs text-on-surface-variant/50">原始输入</p>
                  <p className="text-sm text-on-surface">{resolvedUnderstandingPreview.rawInput}</p>

                  {resolvedUnderstandingPreview.normalizedInput !== resolvedUnderstandingPreview.rawInput ? (
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant/50">标准化后</p>
                      <p className="text-sm text-on-surface">{resolvedUnderstandingPreview.normalizedInput}</p>
                    </div>
                  ) : null}

                  {resolvedUnderstandingPreview.corrections.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant/50">修正</p>
                      <p className="text-sm text-on-surface">{resolvedUnderstandingPreview.corrections.join('、')}</p>
                    </div>
                  ) : null}

                  {resolvedUnderstandingPreview.draftTasks.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant/50">识别任务 ({resolvedUnderstandingPreview.draftTasks.length})</p>
                      <ol className="space-y-1">
                        {resolvedUnderstandingPreview.draftTasks.map((task) => (
                          <li key={task.id} className="text-sm text-on-surface">
                            {task.title}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {resolvedPlanPreview ? (
                <div className="space-y-2 rounded-[0.75rem] bg-muted/30 px-3 py-2.5">
                  <p className="text-xs text-on-surface-variant/50">执行步骤 ({resolvedPlanPreview.steps.length})</p>
                  <ol className="space-y-1">
                    {resolvedPlanPreview.steps.map((step) => (
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
          <div className="min-w-0 flex-1 pr-2">
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
