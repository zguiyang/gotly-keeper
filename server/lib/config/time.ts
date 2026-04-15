import 'server-only'

export { ASIA_SHANGHAI_TIME_ZONE } from '@/shared/time/dayjs'
export const ASIA_SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

export type AssetTimeRangeHint = {
  startsAt: Date
  endsAt: Date
}

export type AssetTimeParseResult = {
  timeText: string | null
  dueAt: Date | null
  rangeHint: AssetTimeRangeHint | null
}
