import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { parseTodoTime } from '@/server/services/time/todo-time-parser'

describe('todo-time-parser', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-29T02:10:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses relative chinese time phrases into exact dueAt values', () => {
    const result = parseTodoTime({
      rawText: '五分钟后',
    })

    expect(result).toEqual({
      rawText: '五分钟后',
      timeText: '五分钟后',
      dueAt: '2026-04-29T02:15:00.000Z',
      sourceSlot: 'rawText',
    })
  })

  it('parses explicit chinese date time phrases into exact dueAt values', () => {
    const result = parseTodoTime({
      rawText: '明天下午三点',
    })

    expect(result).toEqual({
      rawText: '明天下午三点',
      timeText: '明天下午三点',
      dueAt: '2026-04-30T07:00:00.000Z',
      sourceSlot: 'rawText',
    })
  })

  it('normalizes legacy time slots into the canonical timeText slot', () => {
    const result = parseTodoTime({
      slots: {
        time: '两小时后',
      },
    })

    expect(result).toEqual({
      rawText: '两小时后',
      timeText: '两小时后',
      dueAt: '2026-04-29T04:10:00.000Z',
      sourceSlot: 'time',
    })
  })
})
