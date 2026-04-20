'use client'

import { AnimatePresence, motion } from 'motion/react'

import type { WorkspaceRunStage } from '@/shared/workspace/workspace-run.types'

const stageLabels: Record<WorkspaceRunStage, string> = {
  understanding: '正在理解你的需求',
  structuring: '正在梳理信息结构',
  executing: '已选择合适的处理方式，正在执行',
  finalizing: '正在整理结果',
}

const stageProgress: Record<WorkspaceRunStage, number> = {
  understanding: 0.25,
  structuring: 0.5,
  executing: 0.75,
  finalizing: 1,
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
  stage,
  message,
}: {
  stage: WorkspaceRunStage
  message: string | null
}) {
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
            AI 正在处理
          </h2>
          <PulsingDots />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-3 text-sm text-on-surface"
          >
            {stageLabels[stage]}
          </motion.p>
        </AnimatePresence>

        <AnimatePresence>
          {message && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 overflow-hidden text-xs text-on-surface-variant/70"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="h-1 origin-left bg-primary/30"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: stageProgress[stage] }}
        transition={{
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
      />
    </motion.section>
  )
}
