import 'server-only'

import { parseZhTimeText } from '@/server/services/time/zh-time-parser.pure'

import type { AssetTimeRangeHint, AssetTimeParseResult } from '@/server/lib/config/time'

export function parseAssetTimeText(
  text: string,
  now = new Date()
): AssetTimeParseResult {
  return parseZhTimeText(text, now)
}

export function parseAssetSearchTimeHint(
  hint: string | null | undefined,
  now = new Date()
): AssetTimeRangeHint | null {
  if (!hint) return null
  return parseAssetTimeText(hint, now).rangeHint
}
