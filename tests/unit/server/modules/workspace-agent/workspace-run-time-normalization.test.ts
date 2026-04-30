import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { normalizeTodoDraftTaskTimes } from '@/server/modules/workspace-agent/workspace-run-time-normalization'

const mocks = vi.hoisted(() => ({
  resolveTodoTimeWithAi: vi.fn(),
}))

vi.mock('@/server/services/time/resolve-todo-time-with-ai', () => ({
  resolveTodoTimeWithAi: mocks.resolveTodoTimeWithAi,
}))

describe('workspace-run-time-normalization', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-29T02:10:00.000Z'))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds canonical timeText and dueAt to todo draft tasks before planning', async () => {
    mocks.resolveTodoTimeWithAi.mockResolvedValueOnce({
      timeText: '五分钟后',
      dueAt: '2026-04-29T02:15:00.000Z',
    })

    const result = await normalizeTodoDraftTaskTimes([
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
    ], {
      fallbackTimeHints: [],
      referenceTime: '2026-04-29T02:10:00.000Z',
    })

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

  it('fills a missing todo time slot from a single normalized time hint', async () => {
    mocks.resolveTodoTimeWithAi.mockResolvedValueOnce({
      timeText: '两小时后',
      dueAt: '2026-04-29T04:10:00.000Z',
    })

    const result = await normalizeTodoDraftTaskTimes(
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
      {
        fallbackTimeHints: ['两小时后'],
        referenceTime: '2026-04-29T02:10:00.000Z',
      }
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

  it('normalizes aliased dueTime slots into canonical timeText and dueAt', async () => {
    mocks.resolveTodoTimeWithAi.mockResolvedValueOnce({
      timeText: '本周五下班前',
      dueAt: '2026-05-01T10:00:00.000Z',
    })

    const result = await normalizeTodoDraftTaskTimes([
      {
        id: 'draft_1',
        intent: 'create',
        target: 'todos',
        title: '发合同',
        confidence: 0.94,
        ambiguities: [],
        corrections: [],
        slots: {
          dueTime: '本周五下班前',
        },
      },
    ], {
      fallbackTimeHints: [],
      referenceTime: '2026-04-29T02:10:00.000Z',
    })

    expect(result).toEqual([
      {
        id: 'draft_1',
        intent: 'create',
        target: 'todos',
        title: '发合同',
        confidence: 0.94,
        ambiguities: [],
        corrections: [],
        slots: {
          dueTime: '本周五下班前',
          timeText: '本周五下班前',
          dueAt: '2026-05-01T10:00:00.000Z',
        },
      },
    ])
  })

  it('keeps timeText and clears dueAt when ai time resolution fails', async () => {
    mocks.resolveTodoTimeWithAi.mockResolvedValueOnce({
      timeText: '这周末',
      dueAt: null,
    })

    const result = await normalizeTodoDraftTaskTimes(
      [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'todos',
          title: '买菜',
          confidence: 0.94,
          ambiguities: [],
          corrections: [],
          slots: {},
        },
      ],
      {
        fallbackTimeHints: ['这周末'],
        referenceTime: '2026-04-29T02:10:00.000Z',
      }
    )

    expect(result).toEqual([
      {
        id: 'draft_1',
        intent: 'create',
        target: 'todos',
        title: '买菜',
        confidence: 0.94,
        ambiguities: [],
        corrections: [],
        slots: {
          timeText: '这周末',
        },
      },
    ])
  })
})
