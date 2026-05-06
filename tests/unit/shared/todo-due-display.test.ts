import { describe, expect, it } from 'vitest'

import { getTodoDueDisplay } from '@/shared/assets/todo-due-display'

describe('getTodoDueDisplay', () => {
  const now = new Date('2026-04-24T08:32:10.000Z')

  it('makes a normalized due date the primary display text', () => {
    expect(
      getTodoDueDisplay(
        {
          dueAt: new Date('2026-04-29T07:00:00.000Z'),
          timeText: '下周三下午',
        },
        now
      )
    ).toEqual({
      kind: 'scheduled',
      label: '4月29日 15:00',
    })
  })

  it('uses a relative label only for today deadlines', () => {
    expect(
      getTodoDueDisplay(
        {
          dueAt: new Date('2026-04-24T07:00:00.000Z'),
          timeText: '今天下午',
        },
        now
      ).label
    ).toBe('今天 15:00')

    expect(
      getTodoDueDisplay(
        {
          dueAt: new Date('2026-04-25T01:00:00.000Z'),
          timeText: '明天上午',
        },
        now
      ).label
    ).toBe('4月25日 09:00')
  })

  it('shows a time_recorded hint when timeText exists but no dueAt', () => {
    expect(
      getTodoDueDisplay(
        {
          dueAt: null,
          timeText: '后天下午三点',
        },
        now
      )
    ).toEqual({
      kind: 'time_recorded',
      label: '已记录时间描述：后天下午三点',
    })
  })

  it('shows an unscheduled state when no time information exists', () => {
    expect(
      getTodoDueDisplay(
        {
          dueAt: null,
          timeText: null,
        },
        now
      )
    ).toEqual({
      kind: 'unscheduled',
      label: '暂无截止日期',
    })
  })

  it('does not masquerade time_recorded as scheduled', () => {
    const result = getTodoDueDisplay(
      {
        dueAt: null,
        timeText: '客户会前',
      },
      now
    )
    expect(result.kind).toBe('time_recorded')
    expect(result.kind).not.toBe('scheduled')
    expect(result.label).not.toBe('暂无截止日期')
  })
})
