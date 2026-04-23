'use client'

import { AnimatePresence, motion } from 'motion/react'

import { WorkspaceQueryResultsContent } from './workspace-result-panels'
import { workspaceMetaTextClassName, workspacePillClassName } from './workspace-view-primitives'

import type {
  WorkspaceRunApiData,
  WorkspaceRunApiPhase,
} from '@/shared/workspace/workspace-runner.types'

function getPhaseTitle(phase: WorkspaceRunApiPhase['phase']) {
  if (phase === 'parse') {
    return '正在理解你的请求'
  }

  if (phase === 'route') {
    return '正在选择合适的操作'
  }

  if (phase === 'execute') {
    return '正在调用工具'
  }

  return '正在整理结果'
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

function getProgressStep(phase: WorkspaceRunApiPhase['phase']) {
  if (phase === 'parse') {
    return 1
  }

  if (phase === 'route') {
    return 2
  }

  if (phase === 'execute') {
    return 3
  }

  return 4
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

function getTraceStatusLabel(status: 'done' | 'active' | 'waiting' | 'failed') {
  if (status === 'done') {
    return '已完成'
  }

  if (status === 'active') {
    return '进行中'
  }

  if (status === 'failed') {
    return '失败'
  }

  return '等待'
}

function getTraceStatusClass(status: 'done' | 'active' | 'waiting' | 'failed') {
  if (status === 'done') {
    return 'border-border/10 bg-muted/45 text-on-surface-variant/85'
  }

  if (status === 'active') {
    return 'border-primary/15 bg-primary/8 text-primary'
  }

  if (status === 'failed') {
    return 'border-destructive/20 bg-destructive/8 text-destructive'
  }

  return 'border-border/10 bg-muted/25 text-on-surface-variant/70'
}

function getTraceDotClass(status: 'done' | 'active' | 'waiting' | 'failed') {
  if (status === 'done') {
    return 'bg-primary/70'
  }

  if (status === 'active') {
    return 'bg-primary'
  }

  if (status === 'failed') {
    return 'bg-destructive'
  }

  return 'bg-border/40'
}

function getInterpretationCopy(
  visiblePhase: WorkspaceRunApiPhase,
  assistantText: string | null,
  status: 'streaming' | 'success' | 'error'
) {
  if (status !== 'streaming' && assistantText) {
    return assistantText
  }

  if (visiblePhase.phase === 'parse') {
    return visiblePhase.message ?? '正在理解输入'
  }

  if (visiblePhase.phase === 'route') {
    return visiblePhase.message ?? '正在判断是保存还是查询'
  }

  if (visiblePhase.phase === 'execute') {
    return visiblePhase.message ?? '正在调用工具'
  }

  return visiblePhase.message ?? '正在整理结果'
}

function getProcessingCopy(visiblePhase: WorkspaceRunApiPhase) {
  if (visiblePhase.phase === 'parse') {
    return '还在分解输入里的意图'
  }

  if (visiblePhase.phase === 'route') {
    return '正在选择保存、更新或查询路径'
  }

  if (visiblePhase.phase === 'execute') {
    return '正在执行实际处理'
  }

  return '正在收尾并组织结果'
}

function getFinalSummary(
  result: WorkspaceRunApiData | null,
  assistantText: string | null,
  errorMessage: string | null,
  status: 'streaming' | 'success' | 'error'
) {
  if (status === 'error' || result?.kind === 'error') {
    if (result?.kind === 'error') {
      return result.message
    }

    return errorMessage ?? '处理失败，请换个说法再试一次。'
  }

  if (result?.kind === 'query') {
    return `找到 ${result.total} 条${getTargetLabel(result.target)}`
  }

  if (result?.kind === 'mutation') {
    return `${result.action === 'create' ? '已创建' : '已更新'}${getMutationTargetLabel(result.target)}`
  }

  return assistantText ?? '处理完成'
}

function TraceRow({
  label,
  value,
  detail,
  status,
}: {
  label: string
  value: string
  detail?: string | null
  status: 'done' | 'active' | 'waiting' | 'failed'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex items-start gap-3"
    >
      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center pt-1">
        <span
          className={`size-2.5 rounded-full ${getTraceDotClass(status)} ${
            status === 'active' ? 'motion-safe:animate-pulse' : ''
          }`}
        />
      </div>
      <div className="min-w-0 flex-1 rounded-[0.95rem] border border-border/10 bg-surface-container-lowest/75 px-3 py-2.5 shadow-[var(--shadow-elevation-1)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={workspaceMetaTextClassName}>{label}</p>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.02em] ${getTraceStatusClass(status)}`}
          >
            {getTraceStatusLabel(status)}
          </span>
        </div>
        <p className="mt-1 break-words text-sm leading-6 text-on-surface">{value}</p>
        {detail ? (
          <p className="mt-0.5 break-words text-xs leading-5 text-on-surface-variant/75">
            {detail}
          </p>
        ) : null}
      </div>
    </motion.div>
  )
}

function TracePanel({
  submittedText,
  assistantText,
  visiblePhase,
  result,
  errorMessage,
  status,
}: {
  submittedText: string
  assistantText: string | null
  visiblePhase: WorkspaceRunApiPhase
  result: WorkspaceRunApiData | null
  errorMessage: string | null
  status: 'streaming' | 'success' | 'error'
}) {
  const progressStep = getProgressStep(visiblePhase.phase)
  const interpretState =
    status === 'error'
      ? 'failed'
      : status === 'streaming'
        ? progressStep <= 1
          ? 'active'
          : 'done'
        : 'done'
  const processState =
    status === 'error'
      ? 'failed'
      : status === 'streaming'
        ? progressStep === 2 || progressStep === 3
          ? 'active'
          : progressStep > 3
            ? 'done'
            : 'waiting'
        : 'done'
  const resultState =
    status === 'error'
      ? 'failed'
      : status === 'streaming'
        ? progressStep >= 4
          ? 'active'
          : 'waiting'
        : 'done'
  let resultDetail: string | null = null

  if (status === 'streaming') {
    resultDetail = '等待最终结果'
  } else if (result?.kind === 'query') {
    resultDetail = '查询结果在下方展开'
  } else if (result?.kind === 'mutation') {
    resultDetail = '保存结果在下方展开'
  } else if (result?.kind === 'error') {
    resultDetail = result.message
  }

  return (
    <div className="relative">
      <div className="absolute bottom-6 left-[0.56rem] top-6 w-px bg-border/15" />
      <div className="space-y-2.5">
        <TraceRow label="1 / 用户输入" value={submittedText || '—'} status="done" />
        <TraceRow
          label="2 / Gotly 解释"
          value={getInterpretationCopy(visiblePhase, assistantText, status)}
          detail={status === 'streaming' ? visiblePhase.message ?? undefined : undefined}
          status={interpretState}
        />
        <TraceRow
          label="3 / 处理动作"
          value={getPhaseTitle(visiblePhase.phase)}
          detail={getProcessingCopy(visiblePhase)}
          status={processState}
        />
        <TraceRow
          label="4 / 保存或结果"
          value={getFinalSummary(result, assistantText, errorMessage, status)}
          detail={resultDetail}
          status={resultState}
        />
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

export function WorkspaceRunPanel({
  status,
  assistantText,
  phases,
  result = null,
  errorMessage = null,
  submittedText = '',
}: {
  status: 'streaming' | 'success' | 'error'
  assistantText: string | null
  phases: WorkspaceRunApiPhase[]
  result?: WorkspaceRunApiData | null
  errorMessage?: string | null
  submittedText?: string
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
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/10 pb-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-primary/75 uppercase">
            执行轨迹
          </p>
          <p className="mt-1 text-[13px] leading-6 text-on-surface-variant/75">
            输入、解释、处理、结果按顺序展开。
          </p>
        </div>
        <span className={workspacePillClassName}>
          {status === 'streaming' ? '实时流' : '已完成'}
        </span>
      </div>

      <div className="mt-4">
        <TracePanel
          submittedText={submittedText}
          assistantText={assistantText}
          visiblePhase={visiblePhase}
          result={result}
          errorMessage={errorMessage}
          status={status}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {status === 'streaming' ? null : (
          <motion.div
            key="final-result"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 border-t border-border/10 pt-4"
          >
            <FinalResult
              assistantText={assistantText}
              result={result}
              errorMessage={errorMessage}
              status={status}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
