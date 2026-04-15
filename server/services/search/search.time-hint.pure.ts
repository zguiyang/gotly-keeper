import { parseZhTimeText } from '@/server/services/time/zh-time-parser.pure'

import type { AssetTimeParseResult, AssetTimeRangeHint } from '@/server/lib/config/time'

export function parseSearchTimeText(
  text: string,
  now = new Date()
): AssetTimeParseResult {
  return parseZhTimeText(text, now)
}

export function parseSearchTimeHint(
  hint: string | null | undefined,
  now = new Date()
): AssetTimeRangeHint | null {
  if (!hint) return null
  return parseSearchTimeText(hint, now).rangeHint
}
