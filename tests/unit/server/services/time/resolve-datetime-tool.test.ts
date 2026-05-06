import { describe, expect, it } from 'vitest'

import { resolveDatetime } from '@/server/services/time/resolve-datetime-tool'

import type { ResolveDatetimeInput } from '@/server/services/time/resolve-datetime-tool'

/**
 * Reference: 2026-05-06T10:00:00.000Z = Wednesday May 6, 18:00 CST (Asia/Shanghai)
 * All expected values are computed as:
 *   new Date(`${date}T${time}+08:00`).toISOString()
 */
const REFERENCE = '2026-05-06T10:00:00.000Z'

function resolve(phrase: string, overrides?: Partial<ResolveDatetimeInput>) {
  return resolveDatetime({
    phrase,
    referenceTime: REFERENCE,
    ...overrides,
  })
}

describe('resolve-datetime-tool', () => {
  describe('relative offsets with daypart', () => {
    it('resolves "明天上午" → tomorrow 09:00 CST', () => {
      const result = resolve('明天上午')
      expect(result.dueAt).toBe('2026-05-07T01:00:00.000Z')
      expect(result.granularity).toBe('daypart')
      expect(result.normalizedText).toBe('明天上午')
    })

    it('resolves "后天下午三点" → day+2 15:00 CST', () => {
      const result = resolve('后天下午三点')
      expect(result.dueAt).toBe('2026-05-08T07:00:00.000Z')
      expect(result.granularity).toBe('exact')
    })

    it('resolves "明天下午" → tomorrow 15:00 CST', () => {
      const result = resolve('明天下午')
      expect(result.dueAt).toBe('2026-05-07T07:00:00.000Z')
      expect(result.granularity).toBe('daypart')
    })

    it('resolves "大后天" → day+3 18:00 CST (default business)', () => {
      const result = resolve('大后天')
      expect(result.dueAt).toBe('2026-05-09T10:00:00.000Z')
      expect(result.granularity).toBe('date_only')
    })

    it('resolves "今天中午" → today 12:00 CST', () => {
      const result = resolve('今天中午')
      expect(result.dueAt).toBe('2026-05-06T04:00:00.000Z')
      expect(result.granularity).toBe('daypart')
    })
  })

  describe('relative time offsets', () => {
    it('resolves "五分钟后" → +5min', () => {
      const result = resolve('五分钟后')
      expect(result.dueAt).toBe('2026-05-06T10:05:00.000Z')
      expect(result.granularity).toBe('exact')
    })

    it('resolves "三小时后" → +3hr', () => {
      const result = resolve('三小时后')
      expect(result.dueAt).toBe('2026-05-06T13:00:00.000Z')
      expect(result.granularity).toBe('exact')
    })

    it('resolves "3天后" → +3d at default 18:00 CST', () => {
      const result = resolve('3天后')
      expect(result.dueAt).toBe('2026-05-09T10:00:00.000Z')
      expect(result.granularity).toBe('date_only')
    })
  })

  describe('weekday references', () => {
    it('resolves "下周二上午十点" → next Tue 10:00 CST', () => {
      const result = resolve('下周二上午十点')
      expect(result.dueAt).toBe('2026-05-12T02:00:00.000Z')
      expect(result.granularity).toBe('exact')
    })

    it('resolves "本周五下午" → this Fri 15:00 CST', () => {
      const result = resolve('本周五下午')
      expect(result.dueAt).toBe('2026-05-08T07:00:00.000Z')
      expect(result.granularity).toBe('daypart')
    })

    it('resolves "周五" alone → this Fri 18:00 CST', () => {
      const result = resolve('周五')
      expect(result.dueAt).toBe('2026-05-08T10:00:00.000Z')
      expect(result.granularity).toBe('date_only')
    })
  })

  describe('specific dates', () => {
    it('resolves "10月1日" → Oct 1 18:00 CST', () => {
      const result = resolve('10月1日')
      expect(result.dueAt).toBe('2026-10-01T10:00:00.000Z')
      expect(result.granularity).toBe('date_only')
    })

    it('resolves "5月20号" → May 20 18:00 CST', () => {
      const result = resolve('5月20号')
      expect(result.dueAt).toBe('2026-05-20T10:00:00.000Z')
      expect(result.granularity).toBe('date_only')
    })
  })

  describe('period endings', () => {
    it('resolves "月底" → May 31 18:00 CST', () => {
      const result = resolve('月底')
      expect(result.dueAt).toBe('2026-05-31T10:00:00.000Z')
      expect(result.granularity).toBe('date_only')
    })

    it('resolves "本周末" → this Sun 18:00 CST', () => {
      const result = resolve('本周末')
      expect(result.dueAt).toBe('2026-05-10T10:00:00.000Z')
      expect(result.granularity).toBe('date_only')
    })

    it('resolves "下周末" → next Sun 18:00 CST', () => {
      const result = resolve('下周末')
      expect(result.dueAt).toBe('2026-05-17T10:00:00.000Z')
      expect(result.granularity).toBe('date_only')
    })
  })

  describe('"下个月X号" pattern', () => {
    it('resolves "下个月5号" → Jun 5 18:00 CST', () => {
      const result = resolve('下个月5号')
      expect(result.dueAt).toBe('2026-06-05T10:00:00.000Z')
      expect(result.granularity).toBe('date_only')
    })
  })

  describe('daypart + explicit time interaction', () => {
    it('resolves "晚上十点半" → 22:30 CST (十点半+晚上＝22:30)', () => {
      const result = resolve('晚上十点半')
      expect(result.dueAt).toBe('2026-05-06T14:30:00.000Z')
      expect(result.granularity).toBe('exact')
    })

    it('resolves "中午十二点" → 12:00 CST, no modification', () => {
      const result = resolve('中午十二点')
      expect(result.dueAt).toBe('2026-05-06T04:00:00.000Z')
      expect(result.granularity).toBe('exact')
    })

    it('resolves "凌晨三点" → 03:00 CST, no modification', () => {
      const result = resolve('凌晨三点')
      expect(result.dueAt).toBe('2026-05-05T19:00:00.000Z')
      expect(result.granularity).toBe('exact')
    })

    it('resolves "明早八点" → tomorrow 08:00 CST', () => {
      const result = resolve('明早八点')
      expect(result.dueAt).toBe('2026-05-07T00:00:00.000Z')
      expect(result.granularity).toBe('exact')
    })
  })

  describe('explicit time without daypart (fallback to reference date)', () => {
    it('resolves "15:30" → today 15:30 CST', () => {
      const result = resolve('15:30')
      expect(result.dueAt).toBe('2026-05-06T07:30:00.000Z')
      expect(result.granularity).toBe('exact')
    })

    it('resolves "三点" alone → today 03:00 CST', () => {
      const result = resolve('三点')
      expect(result.dueAt).toBe('2026-05-05T19:00:00.000Z')
      expect(result.granularity).toBe('exact')
    })
  })

  describe('vague phrases', () => {
    it.each(['尽快', '有空的时候', '改天', '晚点', '稍后', 'later'])(
      'returns null for "%s"',
      (phrase) => {
        const result = resolve(phrase)
        expect(result.dueAt).toBeNull()
        expect(result.granularity).toBe('vague')
      }
    )
  })

  describe('holiday phrases', () => {
    it.each(['春节', '中秋节', '端午', '国庆放假', '元旦'])(
      'returns null for "%s"',
      (phrase) => {
        const result = resolve(phrase)
        expect(result.dueAt).toBeNull()
        expect(result.granularity).toBe('unresolved')
      }
    )
  })

  describe('unresolved phrases', () => {
    it('returns null for gibberish', () => {
      const result = resolve('abcxyz')
      expect(result.dueAt).toBeNull()
      expect(result.granularity).toBe('unresolved')
    })

    it('returns null for empty phrase', () => {
      const result = resolve('')
      expect(result.dueAt).toBeNull()
      expect(result.granularity).toBe('unresolved')
    })
  })

  describe('normalizedText', () => {
    it('preserves the trimmed original text', () => {
      const result = resolve('  明天下午  ')
      expect(result.normalizedText).toBe('明天下午')
    })
  })

  describe('timezone support', () => {
    it('uses America/New_York for "明天上午"', () => {
      // 2026-05-06T10:00:00.000Z = 06:00 EDT
      // "明天上午" = May 7 09:00 EDT = May 7 13:00 UTC
      const result = resolveDatetime({
        phrase: '明天上午',
        referenceTime: '2026-05-06T10:00:00.000Z',
        timezone: 'America/New_York',
      })
      expect(result.dueAt).toBe('2026-05-07T13:00:00.000Z')
      expect(result.granularity).toBe('daypart')
    })

    it('defaults to Asia/Shanghai when timezone is not passed', () => {
      const result = resolveDatetime({
        phrase: '明天上午',
        referenceTime: '2026-05-06T10:00:00.000Z',
      })
      // Default Asia/Shanghai: May 7 09:00 CST = May 7 01:00 UTC
      expect(result.dueAt).toBe('2026-05-07T01:00:00.000Z')
    })
  })
})
