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
  const message = visiblePhase.message ?? getPhaseFallbackMessage(visiblePhase)

  return (
    <div className="flex min-h-[9.5rem] items-center justify-center">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/8">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/45 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${visiblePhase.phase}-${message}`}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/75">
              Gotly 正在处理
            </p>
            <h2 className="mt-2 font-headline text-xl font-semibold tracking-normal text-on-surface sm:text-2xl">
              {getPhaseTitle(visiblePhase.phase)}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant/75">
              {message}
            </p>
          </motion.div>
        </AnimatePresence>
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
      className="mb-8 rounded-[1.75rem] border border-border/10 bg-surface-container-lowest px-4 py-4 shadow-[var(--shadow-soft)] sm:px-5"
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'streaming' ? (
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
              status={status}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
