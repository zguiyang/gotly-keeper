'use client'

import { AnimatePresence, motion } from 'motion/react'

import type { WorkspaceAgentTraceEvent } from '@/shared/workspace/workspace-run.types'

function getTraceEventBody(event: WorkspaceAgentTraceEvent) {
  if (event.type === 'input_normalized') {
    return event.normalizedRequest
  }

  if (event.type === 'time_resolved') {
    return event.resolution.kind === 'exact_range'
      ? `${event.phrase} · ${event.resolution.basis}`
      : event.resolution.kind === 'vague'
        ? `${event.phrase} · ${event.resolution.reason}`
        : '未使用时间过滤'
  }

  if (event.type === 'intent_identified') {
    return event.publicReason
  }

  if (event.type === 'parameters_collected') {
    return Object.entries(event.parameters)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' · ')
  }

  if (event.type === 'tool_selected') {
    return event.publicReason
  }

  if (event.type === 'tool_executed') {
    return event.resultSummary
  }

  return event.summary
}

function PulsingDots() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60"
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
  traceEvents,
}: {
  status: 'streaming' | 'success' | 'error'
  assistantText: string | null
  traceEvents: WorkspaceAgentTraceEvent[]
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

        {traceEvents.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {traceEvents.map((event, index) => (
              <li
                key={`${event.type}-${index}`}
                className="rounded-xl border border-border/20 bg-surface-container p-3"
              >
                <p className="text-xs font-medium text-on-surface">{event.title}</p>
                <p className="mt-1 text-xs text-on-surface-variant/80">
                  {getTraceEventBody(event)}
                </p>
              </li>
            ))}
          </ol>
        ) : null}

        <AnimatePresence>
          {!assistantText && traceEvents.length === 0 ? (
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
