import 'server-only'

import { tool } from 'ai'
import { z } from 'zod'

import { dayjs, ASIA_SHANGHAI_TIME_ZONE } from '@/shared/time/dayjs'

// ---- 共享输出 schema ----

export const dateOutputSchema = z.object({
  date: z.string().describe('ISO 8601 datetime string'),
})
export type DateOutput = z.infer<typeof dateOutputSchema>

// ---- 内部工具函数 ----

function toReference(referenceTime: string, timezone: string) {
  return dayjs(referenceTime).tz(timezone)
}

function toEndOfDay(d: dayjs.Dayjs) {
  return d.hour(23).minute(59).second(59).millisecond(0).toISOString()
}

function toIsoWeekday(d: dayjs.Dayjs): number {
  return ((d.day() + 6) % 7) + 1
}

// ---- 工具1: compute_date_add ----

export const computeDateAddInputSchema = z.object({
  amount: z.number().int().describe('加减数量（负数表示减法）'),
  unit: z
    .enum(['minute', 'hour', 'day', 'month'])
    .describe('时间单位'),
  referenceTime: z.string().describe('参考 ISO 时间'),
  timezone: z.string().default(ASIA_SHANGHAI_TIME_ZONE).describe('IANA 时区'),
})

export type ComputeDateAddInput = z.infer<typeof computeDateAddInputSchema>

export const computeDateAddTool = tool({
  description:
    '在 referenceTime 基础上加减指定时间单位。用法示例：明天={amount:1,unit:"day"}、三小时后={amount:3,unit:"hour"}、五分钟后={amount:5,unit:"minute"}、下个月={amount:1,unit:"month"}',
  inputSchema: computeDateAddInputSchema,
  execute: async ({ amount, unit, referenceTime, timezone }) => {
    const ref = toReference(referenceTime, timezone)
    const result = ref.add(amount, unit as dayjs.ManipulateType)
    const output = { date: result.toISOString() } satisfies z.infer<typeof dateOutputSchema>
    return output
  },
})

// ---- 工具2: compute_weekday_date ----

export const computeWeekdayDateInputSchema = z.object({
  weekday: z
    .number()
    .int()
    .min(1)
    .max(7)
    .describe('ISO 星期编号：1=周一、2=周二……7=周日'),
  weekOffset: z
    .number()
    .int()
    .min(0)
    .max(1)
    .describe('0=本周、1=下周'),
  referenceTime: z.string().describe('参考 ISO 时间'),
  timezone: z.string().default(ASIA_SHANGHAI_TIME_ZONE).describe('IANA 时区'),
})

export type ComputeWeekdayDateInput = z.infer<typeof computeWeekdayDateInputSchema>

export const computeWeekdayDateTool = tool({
  description:
    '计算本周或下周某一天的日期，返回当天 23:59:59。用法示例：下周二={weekday:2,weekOffset:1}、本周五={weekday:5,weekOffset:0}',
  inputSchema: computeWeekdayDateInputSchema,
  execute: async ({ weekday, weekOffset, referenceTime, timezone }) => {
    const ref = toReference(referenceTime, timezone)
    const todayWeekday = toIsoWeekday(ref)
    const daysUntil = ((weekday - todayWeekday + 7) % 7) + weekOffset * 7
    const result = ref.add(daysUntil, 'day')
    const output = { date: toEndOfDay(result) } satisfies z.infer<typeof dateOutputSchema>
    return output
  },
})

// ---- 工具3: resolve_specific_date ----

export const resolveSpecificDateInputSchema = z.object({
  month: z.number().int().min(1).max(12).describe('目标月份（1-12）'),
  day: z.number().int().min(1).max(31).describe('目标日期（1-31）'),
  referenceTime: z.string().describe('参考 ISO 时间'),
  timezone: z.string().default(ASIA_SHANGHAI_TIME_ZONE).describe('IANA 时区'),
})

export type ResolveSpecificDateInput = z.infer<typeof resolveSpecificDateInputSchema>

export const resolveSpecificDateTool = tool({
  description:
    '将具体月日解析为绝对 ISO 日期，自动推断年份（已过则取明年），返回当天 23:59:59。用法示例：10月1日={month:10,day:1}、下个月5号时 AI 先调用 compute_date_add 得到月份再传入此工具',
  inputSchema: resolveSpecificDateInputSchema,
  execute: async ({ month, day, referenceTime, timezone }) => {
    const ref = toReference(referenceTime, timezone)
    const thisYear = ref.year(ref.year()).month(month - 1).date(day)
    const target = thisYear.isBefore(ref.startOf('day'))
      ? ref.year(ref.year() + 1).month(month - 1).date(day)
      : thisYear
    const output = { date: toEndOfDay(target) } satisfies z.infer<typeof dateOutputSchema>
    return output
  },
})

// ---- 工具4: compute_end_of_period ----

export const computeEndOfPeriodInputSchema = z.object({
  period: z.enum(['month', 'week']).describe('周期类型：month=月、week=周'),
  offset: z
    .number()
    .int()
    .min(0)
    .max(1)
    .describe('0=当前周期、1=下个周期'),
  referenceTime: z.string().describe('参考 ISO 时间'),
  timezone: z.string().default(ASIA_SHANGHAI_TIME_ZONE).describe('IANA 时区'),
})

export type ComputeEndOfPeriodInput = z.infer<typeof computeEndOfPeriodInputSchema>

export const computeEndOfPeriodTool = tool({
  description:
    '计算月或周的结束日期，返回当天 23:59:59。用法示例：月底前={period:"month",offset:0}、下个月底={period:"month",offset:1}、本周末={period:"week",offset:0}、下周末={period:"week",offset:1}',
  inputSchema: computeEndOfPeriodInputSchema,
  execute: async ({ period, offset, referenceTime, timezone }) => {
    const ref = toReference(referenceTime, timezone)
    let result: dayjs.Dayjs

    if (period === 'month') {
      result = ref.add(offset, 'month').endOf('month')
    } else {
      const todayWeekday = toIsoWeekday(ref)
      const daysUntilSunday = 7 - todayWeekday
      result = ref.add(daysUntilSunday + offset * 7, 'day')
    }

    const output = { date: toEndOfDay(result) } satisfies z.infer<typeof dateOutputSchema>
    return output
  },
})

// ---- 工具集导出 ----

export const todoTimeTools = {
  compute_date_add: computeDateAddTool,
  compute_weekday_date: computeWeekdayDateTool,
  resolve_specific_date: resolveSpecificDateTool,
  compute_end_of_period: computeEndOfPeriodTool,
} as const
