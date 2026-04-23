'use client'

import { AlertTriangle, CheckCircle2, Loader2, Search, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { WorkspaceQueryResultsContent } from './workspace-result-panels'

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

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-primary/65"
          animate={{
            opacity: [0.25, 1, 0.25],
            y: [0, -2, 0],
          }}
          transition={{
            duration: 1.15,
            repeat: Infinity,
            delay: index * 0.16,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  )
}

function ThinkingStep({ phase }: { phase: WorkspaceRunApiPhase }) {
  return (
    <motion.div
      key={`${phase.phase}-${phase.status}-${phase.message ?? ''}`}
      initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-on-surface">
            {getPhaseTitle(phase.phase)}
          </p>
          <ThinkingDots />
        </div>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant/75">
          {phase.message ?? '处理中'}
        </p>
      </div>
    </motion.div>
  )
}

function ErrorResult({
  result,
  errorMessage,
}: {
  result: WorkspaceRunApiData | null
  errorMessage: string | null
}) {
  const message =
    result?.kind === 'error'
      ? result.message
      : errorMessage ?? '处理失败，请换个说法再试一次。'

  return (
    <motion.div
      key="error"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3"
      role="status"
      aria-live="polite"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-surface">
          这次没有完成处理
        </p>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          {message}
        </p>
        <p className="mt-3 text-xs leading-5 text-on-surface-variant/65">
          可以换成更明确的说法，比如“总结最近笔记重点”或“查找上周待办”。
        </p>
      </div>
    </motion.div>
  )
}

function QueryResult({
  result,
  assistantText,
}: {
  result: Extract<WorkspaceRunApiData, { kind: 'query' }>
  assistantText: string | null
}) {
  return (
    <motion.div
      key="query"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Search className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-on-surface">
            找到 {result.total} 条{getTargetLabel(result.target)}
          </p>
          {assistantText ? (
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              {assistantText}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 border-t border-border/10 pt-2">
        <WorkspaceQueryResultsContent results={result.items} />
      </div>
    </motion.div>
  )
}

function MutationResult({
  result,
  assistantText,
}: {
  result: Extract<WorkspaceRunApiData, { kind: 'mutation' }>
  assistantText: string | null
}) {
  const actionText = result.action === 'create' ? '已创建' : '已更新'

  return (
    <motion.div
      key="mutation"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3"
      role="status"
      aria-live="polite"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-surface">
          {actionText}{getMutationTargetLabel(result.target)}
        </p>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          {assistantText ?? '内容已经写入工作区。'}
        </p>
        {result.item ? (
          <div className="mt-3 rounded-2xl border border-border/10 bg-muted/45 px-3 py-2">
            <p className="truncate text-sm font-medium text-on-surface">
              {result.item.title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant/70">
              {result.item.excerpt}
            </p>
          </div>
        ) : null}
      </div>
    </motion.div>
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
    return <ErrorResult result={result} errorMessage={errorMessage} />
  }

  if (result?.kind === 'query') {
    return <QueryResult result={result} assistantText={assistantText} />
  }

  if (result?.kind === 'mutation') {
    return <MutationResult result={result} assistantText={assistantText} />
  }

  return (
    <motion.div
      key="answer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3"
      role="status"
      aria-live="polite"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
        <Sparkles className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm leading-6 text-on-surface">
        {assistantText ?? '处理完成。'}
      </p>
    </motion.div>
  )
}

export function WorkspaceRunPanel({
  status,
  assistantText,
  phases,
  result = null,
  errorMessage = null,
}: {
  status: 'streaming' | 'success' | 'error'
  assistantText: string | null
  phases: WorkspaceRunApiPhase[]
  result?: WorkspaceRunApiData | null
  errorMessage?: string | null
}) {
  const visiblePhase = getVisiblePhase(phases)

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 rounded-3xl border border-border/10 bg-surface-container-lowest px-5 py-4 shadow-[var(--shadow-soft)]"
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'streaming' ? (
          <ThinkingStep key="thinking" phase={visiblePhase} />
        ) : (
          <FinalResult
            key="result"
            assistantText={assistantText}
            result={result}
            errorMessage={errorMessage}
            status={status}
          />
        )}
      </AnimatePresence>
    </motion.section>
  )
}
