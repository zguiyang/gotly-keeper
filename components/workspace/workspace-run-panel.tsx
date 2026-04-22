'use client'

import { AnimatePresence, motion } from 'motion/react'

import type { WorkspaceRunApiPhase } from '@/shared/workspace/workspace-runner.types'

function getPhaseTitle(phase: WorkspaceRunApiPhase['phase']) {
  if (phase === 'parse') {
    return '理解请求'
  }

  if (phase === 'route') {
    return '选择操作'
  }

  if (phase === 'execute') {
    return '执行工具'
  }

  return '整理结果'
}

function PulsingDots() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary/60"
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export function WorkspaceRunPanel({
  status,
  assistantText,
  phases,
}: {
  status: 'streaming' | 'success' | 'error'
  assistantText: string | null
  phases: WorkspaceRunApiPhase[]
}) {
  const showStreamingDots = status === 'streaming'

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="mb-8 overflow-hidden rounded-3xl border border-border/10 bg-surface-container-lowest"
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            AI 工作链
          </h2>
          {showStreamingDots ? <PulsingDots /> : null}
        </div>

        {assistantText ? (
          <p className="mt-3 text-sm text-on-surface">{assistantText}</p>
        ) : null}

        {phases.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {phases.map((phase, index) => (
              <li
                key={`${phase.phase}-${index}`}
                className="rounded-xl border border-border/20 bg-surface-container p-3"
              >
                <p className="text-xs font-medium text-on-surface">{getPhaseTitle(phase.phase)}</p>
                <p className="mt-1 text-xs text-on-surface-variant/80">
                  {phase.message ?? '处理中'}
                </p>
              </li>
            ))}
          </ol>
        ) : null}

        <AnimatePresence>
          {!assistantText && phases.length === 0 ? (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 overflow-hidden text-xs text-on-surface-variant/70"
            >
              正在准备执行。
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
