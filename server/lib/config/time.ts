import 'server-only'

export const ASIA_SHANGHAI_TIME_ZONE = 'Asia/Shanghai'
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
