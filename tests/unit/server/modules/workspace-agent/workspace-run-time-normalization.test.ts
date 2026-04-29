import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { normalizeTodoDraftTaskTimes } from '@/server/modules/workspace-agent/workspace-run-time-normalization'

describe('workspace-run-time-normalization', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-29T02:10:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds canonical timeText and dueAt to todo draft tasks before planning', () => {
    const result = normalizeTodoDraftTaskTimes([
      {
        id: 'draft_1',
        intent: 'create',
        target: 'todos',
        title: '发周报',
        confidence: 0.94,
        ambiguities: [],
        corrections: [],
        slots: {
          time: '五分钟后',
        },
      },
    ])

    expect(result).toEqual([
      {
        id: 'draft_1',
        intent: 'create',
        target: 'todos',
        title: '发周报',
        confidence: 0.94,
        ambiguities: [],
        corrections: [],
        slots: {
          time: '五分钟后',
          timeText: '五分钟后',
          dueAt: '2026-04-29T02:15:00.000Z',
        },
      },
    ])
  })

  it('fills a missing todo time slot from a single normalized time hint', () => {
    const result = normalizeTodoDraftTaskTimes(
      [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'todos',
          title: '提交时间解析修复验收',
          confidence: 0.94,
          ambiguities: [],
          corrections: [],
          slots: {},
        },
      ],
      ['两小时后']
    )

    expect(result).toEqual([
      {
        id: 'draft_1',
        intent: 'create',
        target: 'todos',
        title: '提交时间解析修复验收',
        confidence: 0.94,
        ambiguities: [],
        corrections: [],
        slots: {
          timeText: '两小时后',
          dueAt: '2026-04-29T04:10:00.000Z',
        },
      },
    ])
  })
})
