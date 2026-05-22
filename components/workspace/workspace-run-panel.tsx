'use client'

import { useTranslations } from '@/hooks/use-locale'

// DESIGN_TOKEN_EXCEPTION: Warm modern accent colors (amber/emerald/red) are intentionally raw for semantic phase states

import { Check } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  workspacePlanPreviewSchema,
  workspacePreviewSchema,
  workspaceUnderstandingPreviewSchema,
} from '@/shared/workspace/workspace-run-protocol'

import { CandidatePicker } from './candidate-picker'
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
    return 'Normalizing input'
  }

  if (phase === 'semantic_split') {
    return 'Splitting semantic fragments'
  }

  if (phase === 'understand') {
    return 'Understanding your input'
  }

  if (phase === 'plan') {
    return 'Planning execution steps'
  }

  if (phase === 'review') {
    return 'Checking execution risks'
  }

  if (phase === 'preview') {
    return 'Preparing execution preview'
  }

  if (phase === 'execute') {
    return 'Executing'
  }

  return 'Composing result'
}

function getTargetLabel(target: 'notes' | 'todos' | 'bookmarks' | 'mixed') {
  if (target === 'notes') {
    return 'Notes'
  }

  if (target === 'todos') {
    return 'Todos'
  }

  if (target === 'bookmarks') {
    return 'Bookmarks'
  }

  return 'Content'
}

function getMutationTargetLabel(target: 'notes' | 'todos' | 'bookmarks') {
  if (target === 'notes') {
    return 'Note'
  }

  if (target === 'todos') {
    return 'Todo'
  }

  return 'Bookmark'
}

function getToolLabel(toolName: string) {
  if (toolName === 'create_todo') return 'Create Todo'
  if (toolName === 'update_todo') return 'Update Todo'
  if (toolName === 'create_note') return 'Create Note'
  if (toolName === 'update_note') return 'Update Note'
  if (toolName === 'create_bookmark') return 'Create Bookmark'
  if (toolName === 'query_assets') return 'Query Content'
  if (toolName === 'summarize_assets') return 'Summarize Content'
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
    message: 'Preparing to execute',
  }
}

function getPhaseFallbackMessage(visiblePhase: VisibleWorkspaceRunPhase) {
  if (visiblePhase.phase === 'normalize') {
    return 'Organizing raw input for processing.'
  }

  if (visiblePhase.phase === 'semantic_split') {
    return 'Determining if single or multi-task, splitting semantic fragments.'
  }

  if (visiblePhase.phase === 'understand') {
    return 'Identifying intent and tasks to execute.'
  }

  if (visiblePhase.phase === 'plan') {
    return 'Organizing understanding into executable steps.'
  }

  if (visiblePhase.phase === 'review') {
    return 'Determining if direct execution or confirmation needed.'
  }

  if (visiblePhase.phase === 'preview') {
    return 'Preparing execution preview.'
  }

  if (visiblePhase.phase === 'execute') {
    return 'Processing related content.'
  }

  return 'Composing readable response.'
}

function formatElapsedMs(elapsedMs: number | null | undefined) {
  if (!elapsedMs || elapsedMs < 1000) {
    return null
  }

  const totalSeconds = Math.round(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m${String(seconds).padStart(2, '0')}s`
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
      <div className="flex w-full items-start gap-3" role="status" aria-live="polite" aria-atomic="true">
        <ol className="w-full space-y-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {lines.map((line, index) => {
              const isLatest = index === lines.length - 1
              return (
                <motion.li
                  key={line.key}
                  layout
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
                  transition={prefersReducedMotion
                    ? { duration: 0.2, ease: 'linear' }
                    : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-2.5"
                >
                  {isLatest ? (
                    <span className="relative mt-0.5 flex h-3 w-3 shrink-0">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500/50 motion-safe:animate-ping" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                    </span>
                  ) : (
                    <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600/40" />
                  )}
                  <p
                    className={`min-w-0 ${isLatest ? 'text-sm leading-6 text-on-surface' : 'text-sm leading-6 text-on-surface-variant/60'}`}
                    title={line.text}
                  >
                    {line.text}
                  </p>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  )
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
  const t = useTranslations('workspace.runPanel')
  const { activeIndex, nextIndex } = getToolProgress(timeline)
  const visibleSteps = getCompactPlanSteps(planPreview, activeIndex, nextIndex)
  const areToolsFinished = nextIndex >= planPreview.steps.length
  const isComposePhase = visiblePhase.phase === 'compose'

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-on-surface">{planPreview.summary}</p>

      <ol className="grid gap-2.5 sm:gap-3">
        {visibleSteps.map((step) => {
          const absoluteIndex = planPreview.steps.findIndex((candidate) => candidate.id === step.id)
          const isActive = activeIndex !== null ? absoluteIndex === activeIndex : false
          const isCompleted = isComposePhase || areToolsFinished || absoluteIndex < nextIndex

          return (
            <li
              key={step.id}
              className={`rounded-[1rem] border px-3.5 py-3 transition-all duration-300 ${
                isActive
                  ? 'border-amber-500/25 bg-amber-50/60 shadow-[var(--shadow-elevation-1)] dark:bg-amber-900/10'
                  : isCompleted
                    ? 'border-emerald-500/15 bg-emerald-50/40 dark:bg-emerald-900/8'
                    : 'border-border/10 bg-muted/30'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isActive
                    ? 'bg-amber-500 text-white'
                    : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-border/20 text-on-surface-variant/50'
                }`}>
                  {isCompleted ? '✓' : absoluteIndex + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${
                    isActive
                      ? 'text-amber-900 dark:text-amber-200'
                      : isCompleted
                        ? 'text-emerald-800 dark:text-emerald-200'
                        : 'text-on-surface-variant/60'
                  }`}>
                    {step.preview}
                  </p>
                  {isActive ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700/70 dark:text-amber-300/70">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500/60 motion-safe:animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                      </span>
                      {t('processing')}
                    </p>
                  ) : null}
                </div>
              </div>
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
      message: data.message ?? 'Processing failed',
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
  const t = useTranslations('workspace.runPanel')
  const elapsedText = formatElapsedMs(elapsedMs)

  if (status === 'streaming') {
    return null
  }

  if (status === 'error' || result?.kind === 'error') {
    const detailMessage = result?.kind === 'error'
      ? result.message
      : errorMessage ?? 'Processing failed'

    return (
      <div className="rounded-[1rem] border-l-4 border-l-red-400 border-red-200/20 bg-red-50/60 px-4 py-3 dark:bg-red-950/10"> {/* DESIGN_TOKEN_EXCEPTION: semantic error surface tokens */}
        <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t('processingFailed')} {/* DESIGN_TOKEN_EXCEPTION: semantic error color for failure states */}</p>
        <p className="mt-1.5 text-sm leading-6 text-red-600/80 dark:text-red-400/80"> {/* DESIGN_TOKEN_EXCEPTION: semantic error description */}
          {detailMessage}
        </p>
        <p className="mt-3 text-xs text-on-surface-variant/70">{t('retryHint')}</p>
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
          <p className="text-sm font-semibold text-on-surface">{t('noResults')}</p>
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
            {t('found')} {result.total} {getTargetLabel(result.target)}
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
            {result.action === 'create' ? t('created') : t('updated')}
            {getMutationTargetLabel(result.target)}
          </span>
          {assistantText ? (
            <span className={workspaceMetaTextClassName}>{assistantText}</span>
          ) : null}
        </div>
        {result.item ? (
          <div className="rounded-[1rem] border-l-4 border-l-emerald-400 border-border/10 bg-emerald-50/40 px-3 py-2.5 dark:bg-emerald-900/8">
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
        <div className="grid gap-2">
          {result.stepResults.map((step) => {
            const normalized = getBatchStepItem(step)

            if (normalized?.kind === 'mutation') {
              return (
                <div
                  key={step.stepId}
                  className="rounded-[1rem] border-l-4 border-l-emerald-400 border-border/10 bg-emerald-50/40 px-3 py-2.5 dark:bg-emerald-900/8"
                >
                  <p className="text-xs font-medium text-on-surface-variant/70">
                    {normalized.action === 'create' ? t('created') : t('updated')}
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
                    {t('found')} {normalized.total} {getTargetLabel(normalized.target)}
                  </p>
                </div>
              )
            }

            if (normalized?.kind === 'error') {
              return (
                <div
                  key={step.stepId}
                  className="rounded-[1rem] border-l-4 border-l-red-400 border-red-200/20 bg-red-50/60 px-3 py-2.5 dark:bg-red-950/10" {/* DESIGN_TOKEN_EXCEPTION: step failure surface */}
                >
                  <p className="text-xs font-medium text-red-600/90 dark:text-red-400"> {/* DESIGN_TOKEN_EXCEPTION: step failure label */}
                    {getToolLabel(step.toolName)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-red-700 dark:text-red-300"> {/* DESIGN_TOKEN_EXCEPTION: semantic error color for step failure */}
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
        {assistantText ?? t('completed')}
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
  const t = useTranslations('workspace.runPanel')
  const targetLabelMap = {
    todo: 'Todo',
    note: 'Note',
    bookmark: 'Bookmark',
  } as const

  const isBookmarkPrecheck = interaction.source === 'precheck'

  return (
    <div className="space-y-3 rounded-[1.25rem] border-l-4 border-l-amber-400 border-border/10 bg-amber-50/50 px-4 py-3 dark:bg-amber-900/8">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {t('possibleDuplicate')}{targetLabelMap[interaction.target]}
          </span>
          {isBookmarkPrecheck ? (
            <span className="rounded-full border border-amber-200/40 bg-amber-100/60 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300">
              {t('linkPreflightHit')}
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium text-on-surface">{interaction.current.title}</p>
        <p className="text-sm leading-6 text-on-surface-variant/80">{interaction.current.preview}</p>
        {isBookmarkPrecheck ? (
          <p className="text-xs leading-5 text-amber-700/70 dark:text-amber-300/70">
            {t('linkPreflightDescription')}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-on-surface-variant/60 uppercase">{t('existingContent')}</p>
        <ol className="space-y-1.5">
          {interaction.duplicates.map((candidate) => (
            <li
              key={candidate.id}
              className="rounded-[0.85rem] border border-border/10 bg-surface-container-lowest/90 px-3 py-2 shadow-[var(--shadow-elevation-1)]"
            >
              <p className="text-sm font-medium text-on-surface">{candidate.label}</p>
              {candidate.reason ? (
                <p className="mt-0.5 text-xs text-on-surface-variant/70">{candidate.reason}</p>
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
}: {
  interaction: WorkspaceInteraction
  candidateSelection: string | null
  onCandidateSelect: (candidateId: string) => void
  slotFormId: string
  onResume: (response: WorkspaceInteractionResponse) => void
}) {
  const t = useTranslations('workspace.runPanel')
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
  const t = useTranslations('workspace.runPanel')
  if (interaction.type === 'confirm_plan') {
    return t('confirmSteps')
  }

  if (interaction.type === 'select_candidate') {
    return t('selectCandidate')
  }

  if (interaction.type === 'confirm_duplicate') {
    if (interaction.source === 'precheck') {
      return t('duplicateBookmarkHint')
    }

    return t('duplicateContentHint')
  }

  return t('fillMissingInfo')
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
  onResume?: (response: WorkspaceInteractionResponse) => void
}) {
  const t = useTranslations('workspace.runPanel')
  const visiblePhase = getVisiblePhase(timeline)
  const resolvedResult = normalizeFinalResult(result)
  const derivedPreviewState = derivePreviewStateFromTimeline(timeline)
  const resolvedUnderstandingPreview = understandingPreview ?? derivedPreviewState.understandingPreview
  const resolvedPlanPreview = planPreview ?? derivedPreviewState.planPreview
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
            {t('useCandidate')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onResume({ type: 'select_candidate', action: 'skip' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            {t('skip')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onResume({ type: 'select_candidate', action: 'cancel' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            {t('cancel')}
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
            {t('submit')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onResume({ type: 'clarify_slots', action: 'cancel' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            {t('cancel')}
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
            {t('confirmAndExecute')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onResume({ type: 'confirm_plan', action: 'cancel' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            {t('cancel')}
          </Button>
        </div>
      )
    }

    if (interaction.type === 'confirm_duplicate') {
      return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
          <Button
            variant="default"
            onClick={() => onResume({ type: 'confirm_duplicate', action: 'create' })}
            className={workspacePrimaryActionButtonClassName}
          >
            <Check data-icon="inline-start" />
            {t('createAnyway')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onResume({ type: 'confirm_duplicate', action: 'skip' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            {t('skipThis')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onResume({ type: 'confirm_duplicate', action: 'cancel' })}
            className={workspaceSecondaryActionButtonClassName}
          >
            {t('cancel')}
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
        <div className="mt-2 border-t border-border/8 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDetailsExpanded((prev) => !prev)}
            aria-expanded={detailsExpanded}
            className="rounded-full px-3 text-xs text-on-surface-variant/60 hover:text-on-surface"
          >
            {detailsExpanded ? t('collapseDetails') : t('expandDetails')}
          </Button>

          {detailsExpanded ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {resolvedUnderstandingPreview ? (
                <div className="space-y-2 rounded-[0.85rem] bg-amber-50/50 px-3.5 py-3 dark:bg-amber-900/8">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-on-surface-variant/50 uppercase">{t('rawInput')}</p>
                  <p className="text-sm leading-6 text-on-surface">{resolvedUnderstandingPreview.rawInput}</p>

                  {resolvedUnderstandingPreview.normalizedInput !== resolvedUnderstandingPreview.rawInput ? (
                    <div className="space-y-1 pt-1">
                      <p className="text-[11px] font-semibold tracking-[0.08em] text-on-surface-variant/50 uppercase">{t('normalized')}</p>
                      <p className="text-sm leading-6 text-on-surface">{resolvedUnderstandingPreview.normalizedInput}</p>
                    </div>
                  ) : null}

                  {resolvedUnderstandingPreview.corrections.length > 0 ? (
                    <div className="space-y-1 pt-1">
                      <p className="text-[11px] font-semibold tracking-[0.08em] text-on-surface-variant/50 uppercase">{t('correction')}</p>
                      <p className="text-sm leading-6 text-on-surface">{resolvedUnderstandingPreview.corrections.join('、')}</p>
                    </div>
                  ) : null}

                  {resolvedUnderstandingPreview.draftTasks.length > 0 ? (
                    <div className="space-y-1 pt-1">
                      <p className="text-[11px] font-semibold tracking-[0.08em] text-on-surface-variant/50 uppercase">{t('identifyTasks')} ({resolvedUnderstandingPreview.draftTasks.length})</p>
                      <ol className="space-y-1">
                        {resolvedUnderstandingPreview.draftTasks.map((task) => (
                          <li key={task.id} className="text-sm text-on-surface">{task.title}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {resolvedPlanPreview ? (
                <div className="space-y-2 rounded-[0.85rem] bg-emerald-50/50 px-3.5 py-3 dark:bg-emerald-900/8">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-on-surface-variant/50 uppercase">{t('executionSteps')} ({resolvedPlanPreview.steps.length})</p>
                  <ol className="space-y-1">
                    {resolvedPlanPreview.steps.map((step) => (
                      <li key={step.id} className="flex items-start gap-2 text-sm text-on-surface">
                        <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60" />
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
