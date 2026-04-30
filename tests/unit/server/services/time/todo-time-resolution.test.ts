import { describe, expect, it } from 'vitest'

import { resolveTodoTimeText } from '@/server/services/time/todo-time-resolution'

const referenceTime = '2026-04-30T02:10:00.000Z'

describe('todo-time-resolution', () => {
  it('resolves defaultable daypart phrases from the run reference time', () => {
    expect(
      resolveTodoTimeText({
        timeText: '明天上午',
        referenceTime,
      })
    ).toEqual({
      timeText: '明天上午',
      dueAt: '2026-05-01T01:00:00.000Z',
    })

    expect(
      resolveTodoTimeText({
        timeText: '今晚',
        referenceTime,
      })
    ).toEqual({
      timeText: '今晚',
      dueAt: '2026-04-30T12:00:00.000Z',
    })
  })

  it('resolves explicit calendar phrases without drifting the year or time', () => {
    expect(
      resolveTodoTimeText({
        timeText: '5月1日18:30',
        referenceTime,
      })
    ).toEqual({
      timeText: '5月1日18:30',
      dueAt: '2026-05-01T10:30:00.000Z',
    })

    expect(
      resolveTodoTimeText({
        timeText: '劳动节当天',
        referenceTime,
      })
    ).toEqual({
      timeText: '劳动节当天',
      dueAt: '2026-05-01T15:59:59.000Z',
    })
  })

  it('uses deterministic business defaults for deadline phrases', () => {
    expect(
      resolveTodoTimeText({
        timeText: '本周五下班前',
        referenceTime,
      })
    ).toEqual({
      timeText: '本周五下班前',
      dueAt: '2026-05-01T10:00:00.000Z',
    })

    expect(
      resolveTodoTimeText({
        timeText: '月底前',
        referenceTime,
      })
    ).toEqual({
      timeText: '月底前',
      dueAt: '2026-04-30T15:59:59.000Z',
    })
  })

  it('returns a null dueAt for vague time phrases', () => {
    expect(
      resolveTodoTimeText({
        timeText: '尽快',
        referenceTime,
      })
    ).toEqual({
      timeText: '尽快',
      dueAt: null,
    })
  })
})
