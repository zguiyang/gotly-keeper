'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { CandidatePicker } from './candidate-picker'
import { DraftTaskEditor } from './draft-task-editor'
import { PlanPreviewCard } from './plan-preview-card'
import { RunTimeline } from './run-timeline'
import { SlotClarificationForm } from './slot-clarification-form'
import { UnderstandingPreview } from './understanding-preview'
import { WorkspaceQueryResultsContent } from './workspace-result-panels'
import { workspaceMetaTextClassName, workspacePillClassName } from './workspace-view-primitives'

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

function getPhaseTitle(phase: WorkspaceRunApiPhase['phase']) {
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

function getVisiblePhase(phases: WorkspaceRunApiPhase[]) {
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

function getPhaseFallbackMessage(visiblePhase: WorkspaceRunApiPhase) {
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

function CurrentStep({
  visiblePhase,
}: {
  visiblePhase: WorkspaceRunApiPhase
}) {
  const prefersReducedMotion = useReducedMotion()
  const phaseTitle = getPhaseTitle(visiblePhase.phase)
  const message = visiblePhase.message ?? getPhaseFallbackMessage(visiblePhase)
  const lineText = message ? `${phaseTitle} · ${message}` : phaseTitle
  const lineKey = `${visiblePhase.phase}-${message}`

  return (
    <div className="flex min-h-[6.5rem] items-center justify-start">
      <div className="flex w-full items-center gap-3 px-1 sm:px-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary/45 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>

        <div className="relative h-7 min-w-0 flex-1" role="status" aria-live="polite" aria-atomic="true">
          <AnimatePresence initial={false}>
            <motion.p
              key={lineKey}
              initial={prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 10, backgroundPosition: '100% 50%' }}
              animate={prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, backgroundPosition: '0% 50%' }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={prefersReducedMotion
                ? { duration: 0.18, ease: 'linear' }
                : { duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 truncate bg-gradient-to-r from-on-surface-variant/75 via-on-surface to-on-surface-variant/80 bg-[length:220%_100%] bg-clip-text text-left text-sm leading-7 text-transparent drop-shadow-[0_1px_5px_rgba(15,23,42,0.1)] dark:drop-shadow-[0_1px_7px_rgba(255,255,255,0.06)] forced-colors:bg-none forced-colors:text-[CanvasText] forced-colors:[-webkit-text-fill-color:CanvasText]"
              title={lineText}
            >
              {lineText}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function FinalResult({
  assistantText,
  result,
  errorMessage,
  status,
}: {
  assistantText: string | null
  result: WorkspaceRunApiData | null
  errorMessage: string | null
  status: 'streaming' | 'success' | 'error'
}) {
  if (status === 'streaming') {
    return null
  }

  if (status === 'error' || result?.kind === 'error') {
    return (
      <div className="rounded-[1rem] border border-destructive/15 bg-destructive/5 px-4 py-3">
        <p className="mb-1 text-sm font-semibold text-destructive">
          这次没有完成处理
        </p>
        <p className="text-sm font-medium text-destructive">
          {result?.kind === 'error'
            ? result.message
            : errorMessage ?? '处理失败，请换个说法再试一次。'}
        </p>
        <p className="mt-1 text-xs leading-5 text-on-surface-variant/80">
          可以换成更明确的说法，比如“总结最近笔记重点”或“查找上周待办”。
        </p>
      </div>
    )
  }

  if (result?.kind === 'query') {
    if (result.total === 0) {
      return (
        <div className="rounded-[1rem] border border-border/10 bg-muted/35 px-4 py-4">
          <p className="text-sm font-semibold text-on-surface">没有找到相关内容</p>
          {assistantText ? (
            <p className="mt-1 text-sm leading-6 text-on-surface-variant/80">
              {assistantText}
            </p>
          ) : null}
          <p className="mt-1 text-xs leading-5 text-on-surface-variant/70">
            可以换个关键词，或先在上方保存一条新记录。
          </p>
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
      </div>
    )
  }

  return (
    <div className="rounded-[1rem] border border-border/10 bg-muted/35 px-4 py-3">
      <p className="break-words text-sm leading-6 text-on-surface">
        {assistantText ?? '处理完成。'}
      </p>
    </div>
  )
}

function InteractionPanel({
  interaction,
  onResume,
}: {
  interaction: WorkspaceInteraction
  onResume: (response: WorkspaceInteractionResponse) => void
}) {
  switch (interaction.type) {
    case 'select_candidate':
      return <CandidatePicker interaction={interaction} onSubmit={onResume} />
    case 'clarify_slots':
      return <SlotClarificationForm interaction={interaction} onSubmit={onResume} />
    case 'edit_draft_tasks':
      return <DraftTaskEditor interaction={interaction} onSubmit={onResume} />
    case 'confirm_plan':
      return <PlanPreviewCard interaction={interaction} onSubmit={onResume} />
    default:
      return null
  }
}

export function WorkspaceRunPanel({
  status,
  assistantText,
  phases,
  result = null,
  errorMessage = null,
  runId,
  interaction,
  timeline,
  understandingPreview,
  planPreview,
  correctionNotes,
  onResume,
}: {
  status: 'idle' | 'streaming' | 'awaiting_user' | 'success' | 'error'
  assistantText: string | null
  phases: WorkspaceRunApiPhase[]
  result?: WorkspaceRunApiData | null
  errorMessage?: string | null
  runId?: string
  interaction?: WorkspaceInteraction
  timeline?: WorkspaceRunStreamEvent[]
  understandingPreview?: WorkspaceUnderstandingPreview | null
  planPreview?: WorkspacePlanPreview | null
  correctionNotes?: string[]
  onResume?: (response: WorkspaceInteractionResponse) => void
}) {
  const visiblePhase = getVisiblePhase(phases)

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 rounded-[1.75rem] border border-border/10 bg-surface-container-lowest px-4 py-4 shadow-[var(--shadow-soft)] sm:px-5"
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
            <InteractionPanel interaction={interaction} onResume={onResume} />
          </motion.div>
        ) : status === 'streaming' ? (
          <motion.div
            key="current-step"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <CurrentStep visiblePhase={visiblePhase} />
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
              result={result}
              errorMessage={errorMessage}
              status={(status === 'idle' ? 'success' : status) as 'success' | 'error'}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
